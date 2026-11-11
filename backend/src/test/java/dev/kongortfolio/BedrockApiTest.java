package dev.kongortfolio;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ExtendWith(OutputCaptureExtension.class)
class BedrockApiTest {
    @Value("${local.server.port}")
    private int port;

    @Test void respondsWithPreparingAndLogsTheApiAccess(CapturedOutput output) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/bedrock"))
            .POST(HttpRequest.BodyPublishers.noBody()).build();
        var response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("cache-control")).contains("no-store");
        var json = new tools.jackson.databind.ObjectMapper().readTree(response.body());
        assertThat(json.path("status").asText()).isEqualTo("PREPARING");
        await().untilAsserted(() -> assertThat(output.getOut()).contains(" INFO ", "API accessed method=POST path=/api/bedrock status=200 durationMs="));
    }

    @Test void logsAllApiRoutesToInfoFileWithoutQueryValues(CapturedOutput output) throws Exception {
        var client = HttpClient.newHttpClient();
        for (String path : new String[] {"/api/profile?lang=en&probe=synthetic-private-query", "/api/health", "/api/missing"}) {
            client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).build(), HttpResponse.BodyHandlers.ofString());
        }
        await().untilAsserted(() -> {
            String text = Files.readString(Path.of(".local/logs/info.log"));
            for (String line : new String[] {"path=/api/profile status=200", "path=/api/health status=200", "path=/api/missing status=404"}) {
                assertThat(text).contains(line);
                assertThat(output.getOut()).contains(line);
            }
            assertThat(text).doesNotContain("synthetic-private-query");
        });
    }
}
