package dev.kongortfolio.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(OutputCaptureExtension.class)
class PortfolioLambdaHandlerTest {
    private final ObjectMapper mapper = new ObjectMapper();

    private JsonNode invoke(String method, String path, String query) throws Exception {
        var event = Map.of(
            "version", "2.0", "routeKey", "$default", "rawPath", path, "rawQueryString", query,
            "headers", Map.of("host", "example.execute-api.ap-northeast-1.amazonaws.com", "x-forwarded-proto", "https"),
            "requestContext", Map.of("stage", "$default", "requestId", "synthetic-test",
                "http", Map.of("method", method, "path", path, "protocol", "HTTP/1.1", "sourceIp", "127.0.0.1")),
            "isBase64Encoded", false
        );
        Context context = mock(Context.class);
        when(context.getRemainingTimeInMillis()).thenReturn(30_000);
        when(context.getAwsRequestId()).thenReturn("synthetic-test");
        var output = new ByteArrayOutputStream();
        new PortfolioLambdaHandler().handleRequest(new ByteArrayInputStream(mapper.writeValueAsBytes(event)), output, context);
        return mapper.readTree(output.toByteArray());
    }

    private String body(JsonNode response) {
        String body = response.path("body").asText();
        return response.path("isBase64Encoded").asBoolean()
            ? new String(Base64.getDecoder().decode(body), StandardCharsets.UTF_8) : body;
    }

    @Test void preservesThreeLanguagesAndJapaneseFallbackAcrossWarmRequests() throws Exception {
        for (String[] sample : new String[][] {{"ja", "ソフトウェアエンジニア"}, {"zh", "软件工程师"}, {"en", "Software engineer"}, {"invalid", "ソフトウェアエンジニア"}}) {
            JsonNode response = invoke("GET", "/api/profile", "lang=" + sample[0]);
            assertThat(response.path("statusCode").asInt()).isEqualTo(200);
            assertThat(body(response)).contains(sample[1]);
            assertThat(response.path("headers").toString().toLowerCase()).contains("application/json", "no-store");
        }
    }

    @Test void servesHealthAndBedrockPlaceholderWithoutCallingAws() throws Exception {
        JsonNode health = invoke("GET", "/api/health", "");
        assertThat(health.path("statusCode").asInt()).isEqualTo(200);
        assertThat(mapper.readTree(body(health)).path("status").asText()).isEqualTo("UP");
        JsonNode bedrock = invoke("POST", "/api/bedrock", "");
        assertThat(bedrock.path("statusCode").asInt()).isEqualTo(200);
        assertThat(mapper.readTree(body(bedrock)).path("status").asText()).isEqualTo("PREPARING");
        var rootLogger = (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
        assertThat(rootLogger.getAppender("INFO_FILE")).isNull();
    }

    @Test void exposesReviewedQuestionsWhileModelFeatureIsDisabled() throws Exception {
        JsonNode response = invoke("GET", "/api/bedrock/questions", "language=zh");
        assertThat(response.path("statusCode").asInt()).isEqualTo(200);
        JsonNode json = mapper.readTree(body(response));
        assertThat(json.path("enabled").asBoolean()).isFalse();
        assertThat(json.path("questions").size()).isEqualTo(17);
        assertThat(json.path("policyVersion").asText()).isEqualTo("portfolio-scope-v1");
        assertThat(json.path("questions").get(0).path("message").asText()).contains("请介绍一下你自己");
    }

    @Test void returnsRealApiErrorsAndLogsWithoutQueryValues(CapturedOutput output) throws Exception {
        JsonNode response = invoke("GET", "/api/missing", "probe=synthetic-private-query");
        assertThat(response.path("statusCode").asInt()).isEqualTo(404);
        assertThat(body(response)).doesNotContain("<html");
        assertThat(invoke("GET", "/api/bedrock", "").path("statusCode").asInt()).isEqualTo(405);
        assertThat(output.getOut()).contains("API accessed method=GET path=/api/missing status=404");
        assertThat(output.getOut()).doesNotContain("synthetic-private-query");
    }
}
