package dev.kongortfolio.bedrock;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.assertThat;

/** Corpus regression against the real service and a deterministic in-process gateway. No Spring or AWS client. */
class OfflineQaEvaluationTest {
    record Suite(String version, String facts, List<Sample> cases) {}
    record Sample(String id, String language, String question, String modelResponse,
                  boolean truncated, String expectedOutcome, String expectedContains) {}

    @Test void evaluatesOfflineCorpusAndWritesRedactedReport() throws Exception {
        var mapper = new ObjectMapper();
        Path report = Path.of("target/qa-eval/report.json");
        Files.createDirectories(report.getParent());
        // Invalidate a previous success even if fixture loading or runner setup fails.
        Files.writeString(report, mapper.writeValueAsString(Map.of("mode", "offline-stub", "passed", false, "state", "STARTED")));
        byte[] fixture;
        String override = System.getProperty("qa.eval.cases");
        if (override != null) fixture = Files.readAllBytes(Path.of(override));
        else try (var input = getClass().getResourceAsStream("/qa-eval/cases.json")) {
            assertThat(input).as("Bundled evaluation corpus").isNotNull();
            fixture = input.readAllBytes();
        }
        var suite = mapper.readValue(fixture, Suite.class);
        assertThat(suite.version()).isNotBlank();
        assertThat(suite.facts()).isNotBlank();
        assertThat(suite.cases()).isNotEmpty();
        var ids = new HashSet<String>();
        for (var sample : suite.cases()) {
            assertThat(sample.id()).matches("[a-z0-9-]+");
            assertThat(ids.add(sample.id())).as("Unique case ID").isTrue();
            assertThat(sample.language()).isIn("ja", "zh", "en");
            assertThat(sample.question()).isNotBlank();
            assertThat(sample.modelResponse()).isNotNull();
            assertThat(sample.expectedOutcome()).isIn("ANSWER", "REFUSED", "MODEL_LANGUAGE_MISMATCH", "INVALID_MODEL_RESPONSE");
            assertThat(sample.expectedContains()).isNotNull();
        }
        var results = new ArrayList<Map<String, Object>>();
        for (var sample : suite.cases()) {
            var calls = new AtomicInteger();
            ModelGateway stub = (system, message) -> {
                calls.incrementAndGet();
                return new ModelGateway.Answer(sample.modelResponse(), sample.truncated(), 100, 10);
            };
            var service = new QuestionService(stub, suite.facts(), () -> 0);
            String outcome;
            String answer = "";
            try {
                var result = service.ask(sample.question(), sample.language());
                outcome = result.refused() ? "REFUSED" : "ANSWER";
                answer = result.text();
            } catch (ModelGateway.Failure failure) {
                outcome = Set.of("MODEL_LANGUAGE_MISMATCH", "INVALID_MODEL_RESPONSE").contains(failure.code)
                    ? failure.code : "UNEXPECTED_SERVICE_FAILURE";
            } catch (RuntimeException failure) {
                outcome = "RUNNER_ERROR";
            }
            boolean passed = outcome.equals(sample.expectedOutcome()) && calls.get() == 1
                && answer.contains(sample.expectedContains())
                && (!outcome.equals("REFUSED") || answer.equals(QuestionScope.refusal(sample.language())));
            // Never persist questions, answers, facts, prompts or exception messages.
            results.add(Map.of("id", sample.id(), "language", sample.language(), "expected", sample.expectedOutcome(),
                "observed", outcome, "stubCalls", calls.get(), "passed", passed));
        }
        long passed = results.stream().filter(result -> Boolean.TRUE.equals(result.get("passed"))).count();
        byte[] service = Files.readAllBytes(Path.of("src/main/java/dev/kongortfolio/bedrock/QuestionService.java"));
        var summary = Map.of("mode", "offline-stub", "suiteVersion", suite.version(), "fixtureSha256", digest(fixture),
            "serviceSha256", digest(service), "realModelCalls", 0, "total", results.size(), "passedCount", passed,
            "passed", passed == results.size(), "cases", results);
        Files.writeString(report, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(summary));
        assertThat(passed).as("Offline corpus; inspect target/qa-eval/report.json").isEqualTo(results.size());
    }

    private static String digest(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }
}
