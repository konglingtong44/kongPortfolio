package dev.kongortfolio;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ProfileApiTest {
    @Value("${local.server.port}")
    private int port;
    private final HttpClient client = HttpClient.newHttpClient();

    private HttpResponse<String> get(String path) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test void servesAllThreeLanguagesOverHttp() throws Exception {
        for (String[] sample : new String[][] {{"ja", "ソフトウェアエンジニア"}, {"zh", "软件工程师"}, {"en", "Software engineer"}, {"zh-TW", "软件工程师"}}) {
            var response = get("/api/profile?lang=" + sample[0]);
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(response.headers().firstValue("content-type").orElse("")).contains("application/json");
            assertThat(response.body()).contains("K", sample[1], "\"projects\":", "\"timeline\":", "\"qualifications\":", "\"note\":");
        }
    }

    @Test void fallsBackToJapanese() throws Exception {
        for (String query : new String[] {"", "?lang=fr", "?lang="}) {
            assertThat(get("/api/profile" + query).body()).contains("ソフトウェアエンジニア");
        }
    }

    @Test void keepsResumeEvidenceAndPlansDistinctAcrossLanguages() throws Exception {
        var mapper = new tools.jackson.databind.ObjectMapper();
        for (String language : new String[] {"ja", "zh", "en"}) {
            var content = mapper.readTree(get("/api/profile?lang=" + language).body());
            assertThat(content.path("projects").size()).isEqualTo(6);
            assertThat(content.path("projects").get(0).path("kind").asText()).isEqualTo("personal");
            assertThat(content.path("projects").get(1).path("kind").asText()).isEqualTo("work");
            assertThat(content.path("projects").get(5).path("outcome").asText()).contains("30");
            assertThat(content.path("timeline").size()).isEqualTo(6);
            var telecom = content.path("projects").get(5);
            assertThat(telecom.path("period").asText()).isEqualTo("2018.06 — 2023.05");
            assertThat(telecom.path("team").asText()).contains("1–15");
            assertThat(telecom.path("tags").toString()).contains("Hadoop", "WildFly", "Nginx");
            assertThat(content.path("timeline").get(4).path("period").asText()).isEqualTo(telecom.path("period").asText());
            assertThat(content.path("timeline").get(5).path("period").asText()).isEqualTo("2014.09 — 2018.06");
            assertThat(content.path("timeline").get(0).path("period").asText()).startsWith("2026.08");
            assertThat(content.path("qualifications").get(0).path("date").asText()).contains("2021.08");
            assertThat(content.path("note").path("paragraphs").size()).isEqualTo(3);
        }
    }

    @Test void exposesOnlyPublicHealth() throws Exception {
        var health = get("/api/health");
        assertThat(health.statusCode()).isEqualTo(200);
        assertThat(health.body()).contains("\"status\":\"UP\"").doesNotContain("\"components\"", "\"details\"");
        assertThat(get("/api/env").statusCode()).isEqualTo(404);
        assertThat(get("/api/beans").statusCode()).isEqualTo(404);
    }

    @Test void servesReviewedPeriodsAndDetailedTechnologyEvidence() throws Exception {
        var mapper = new tools.jackson.databind.ObjectMapper();
        String[] starts = {"2026.08", "2025.07", "2025.01", "2023.06", "2018.06"};
        for (String language : new String[] {"ja", "zh", "en"}) {
            var content = mapper.readTree(get("/api/profile?lang=" + language).body());
            for (int index = 0; index < starts.length; index++) {
                var project = content.path("projects").get(index + 1);
                assertThat(project.path("period").asText()).startsWith(starts[index]);
                assertThat(content.path("timeline").get(index).path("period").asText()).isEqualTo(project.path("period").asText());
                assertThat(project.path("responsibilities").size()).isGreaterThanOrEqualTo(4);
                assertThat(project.path("environment").size()).isGreaterThanOrEqualTo(2);
                assertThat(project.path("team").asText()).isNotBlank();
            }
            assertThat(content.path("skills").size()).isEqualTo(12);
            assertThat(content.path("skills").get(1).path("items").toString()).contains("MyBatis", "Hibernate");
            assertThat(content.path("skills").get(3).path("items").toString()).contains("PostgreSQL", "DB2", "MongoDB");
            // Test source is public too: never embed private values in assertions.
            String[] publicFields = {"name", "role", "introduction", "focus", "projects", "timeline", "skills", "qualifications", "note"};
            assertThat(content.size()).isEqualTo(publicFields.length);
            for (String field : publicFields) {
                assertThat(content.has(field)).as("public field %s", field).isTrue();
            }
        }
    }
}
