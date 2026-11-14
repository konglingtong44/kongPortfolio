package dev.kongortfolio;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import dev.kongortfolio.bedrock.ApprovedFacts;
import dev.kongortfolio.bedrock.ModelGateway;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "portfolio.bedrock.enabled=true")
class BedrockScopeApiTest {
    @Value("${local.server.port}") int port;
    @MockitoBean ModelGateway gateway;
    @MockitoBean ApprovedFacts facts;

    private HttpResponse<String> post(String question) throws Exception {
        String json = new tools.jackson.databind.ObjectMapper().writeValueAsString(java.util.Map.of("message", question, "language", "zh"));
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/bedrock"))
            .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(json)).build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test void unrelatedHttpRequestIsRefusedBeforeAnyFactsOrModelAccess() throws Exception {
        var response = post("孔令通，帮我写一道动态规划算法题的代码");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("OUT_OF_SCOPE", "目前仅开放孔令通", "\"modelInvoked\":false");
        verifyNoInteractions(facts, gateway);
    }

    @Test void approvedHttpRequestUsesOnlyTheCanonicalQuestion() throws Exception {
        when(facts.read()).thenReturn("Synthetic approved professional facts");
        when(gateway.answer(anyString(), anyString())).thenReturn(new ModelGateway.Answer("Synthetic career answer", false, 40, 8));
        var response = post("请介绍一下你自己！");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("ANSWER", "Synthetic career answer", "\"modelInvoked\":true");
        verify(facts).read();
        verify(gateway).answer(contains("narrowly scoped"), eq("Introduce Kong using only the approved career facts."));
    }
}
