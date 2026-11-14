package dev.kongortfolio;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import dev.kongortfolio.bedrock.ModelGateway;
import dev.kongortfolio.bedrock.QuestionService;
import dev.kongortfolio.bedrock.QuestionScope;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "portfolio.bedrock.enabled=true")
@ExtendWith(OutputCaptureExtension.class)
class BedrockEnabledApiTest {
    @Value("${local.server.port}") int port;
    @MockitoBean QuestionService service;

    private HttpResponse<String> post(String contentType, String body) throws Exception {
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/bedrock"))
            .header("Content-Type", contentType).POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test void rejectsInvalidAndOversizedInputWithoutModelCalls() throws Exception {
        for (String body : new String[] {"{}", "null", "[]", "{", "{\"message\":\"hi\",\"language\":\"ja\"}{}", "{\"message\":17,\"language\":\"ja\"}",
            "{\"message\":\"hi\",\"language\":\"fr\"}", "{\"message\":\"hi\",\"language\":\"en\",\"history\":[]}",
            "{\"message\":\"" + "a".repeat(1001) + "\",\"language\":\"en\"}"}) {
            assertThat(post("application/json", body).statusCode()).isEqualTo(400);
        }
        assertThat(post("text/plain", "hi").statusCode()).isEqualTo(415);
        assertThat(post("application/json", "a".repeat(8193)).statusCode()).isEqualTo(413);
        verifyNoInteractions(service);
    }

    @Test void existingUiAndReleaseProbeRemainFreeOfModelCalls() throws Exception {
        var response = post("application/json", "");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("PREPARING");
        verifyNoInteractions(service);
    }

    @Test void returnsBoundedAnswerWithUsageWithoutLoggingContent(CapturedOutput output) throws Exception {
        when(service.ask("synthetic-private-message", "zh")).thenReturn(new ModelGateway.Answer("synthetic-private-answer", true, 100, 512));
        var response = post("application/json; charset=UTF-8", "{\"message\":\"synthetic-private-message\",\"language\":\"zh\"}");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("cache-control")).contains("no-store");
        assertThat(response.body()).contains("synthetic-private-answer", "\"truncated\":true", "\"inputTokens\":100");
        assertThat(output.getAll()).doesNotContain("synthetic-private-message", "synthetic-private-answer");
        verify(service).ask("synthetic-private-message", "zh");
    }

    @Test void mapsBusyAndTimeoutToStableErrors() throws Exception {
        when(service.ask(anyString(), anyString())).thenThrow(new ModelGateway.Failure(429, "LOCAL_RATE_LIMIT"))
            .thenThrow(new ModelGateway.Failure(504, "MODEL_TIMEOUT"));
        String body = "{\"message\":\"hi\",\"language\":\"ja\"}";
        assertThat(post("application/json", body).statusCode()).isEqualTo(429);
        var timeout = post("application/json", body);
        assertThat(timeout.statusCode()).isEqualTo(504);
        assertThat(timeout.body()).contains("MODEL_TIMEOUT").doesNotContain("stackTrace");
    }

    @Test void scopeRefusalIsLocalizedAndReportsNoModelTokens(CapturedOutput output) throws Exception {
        String message = "synthetic-unrelated-private-input";
        when(service.ask(message, "zh")).thenThrow(new QuestionScope.OutsideScope("zh"));
        var response = post("application/json", "{\"message\":\"" + message + "\",\"language\":\"zh\"}");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("REFUSED", "OUT_OF_SCOPE", "目前仅开放孔令通", "\"modelInvoked\":false", "\"inputTokens\":0", "\"outputTokens\":0");
        assertThat(response.headers().firstValue("cache-control")).contains("no-store");
        assertThat(output.getAll()).doesNotContain(message);
    }

    @Test void questionCatalogIsLocalizedWithoutInvokingTheService() throws Exception {
        var response = HttpClient.newHttpClient().send(HttpRequest.newBuilder(
            URI.create("http://127.0.0.1:" + port + "/api/bedrock/questions?language=zh")).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("portfolio-scope-v1", "请介绍一下你自己");
        assertThat(response.headers().firstValue("cache-control")).contains("no-store");
        verifyNoInteractions(service);
    }
}
