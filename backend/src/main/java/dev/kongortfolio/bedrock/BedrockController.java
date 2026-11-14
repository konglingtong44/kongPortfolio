package dev.kongortfolio.bedrock;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.DeserializationFeature;

@RestController
public class BedrockController {
    private final BedrockSettings settings;
    private final QuestionService service;
    private final ObjectMapper mapper;

    public BedrockController(BedrockSettings settings, QuestionService service, ObjectMapper mapper) {
        this.settings = settings;
        this.service = service;
        this.mapper = mapper;
    }

    @GetMapping("/api/bedrock/questions")
    public Map<String, Object> questions(@RequestParam(defaultValue = "ja") String language) {
        return Map.of("enabled", settings.enabled(), "policyVersion", QuestionScope.VERSION,
            "questions", QuestionScope.choices(language));
    }

    @PostMapping("/api/bedrock")
    public ResponseEntity<?> answer(HttpServletRequest request) throws IOException {
        if (!settings.enabled()) return ResponseEntity.ok(Map.of("status", "PREPARING"));
        byte[] body = request.getInputStream().readNBytes(8193);
        if (body.length > 8192) return error(413, "INPUT_TOO_LARGE");
        // Preserve the existing UI/release probe: an empty POST never invokes a model.
        if (body.length == 0) return ResponseEntity.ok(Map.of("status", "PREPARING"));
        if (request.getContentType() == null || !request.getContentType().split(";", 2)[0].trim().equalsIgnoreCase("application/json")) {
            return error(415, "JSON_REQUIRED");
        }
        String message;
        String language;
        try {
            var json = mapper.reader().with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readTree(body);
            if (json == null || !json.isObject() || json.properties().stream().anyMatch(e -> !Set.of("message", "language").contains(e.getKey()))
                || !json.path("message").isString() || !json.path("language").isString()) return error(400, "INVALID_INPUT");
            message = json.path("message").asText().strip();
            language = json.path("language").asText();
            if (message.isBlank() || message.codePointCount(0, message.length()) > 1000
                || !Set.of("ja", "zh", "en").contains(language)) return error(400, "INVALID_INPUT");
        } catch (RuntimeException malformed) { return error(400, "INVALID_INPUT"); }
        try {
            var answer = service.ask(message, language);
            return ResponseEntity.ok(Map.of("status", "ANSWER", "answer", answer.text(), "truncated", answer.truncated(),
                "policyVersion", QuestionScope.VERSION, "modelInvoked", true,
                "usage", Map.of("inputTokens", answer.inputTokens(), "outputTokens", answer.outputTokens())));
        } catch (QuestionScope.OutsideScope refused) {
            return ResponseEntity.ok(Map.of("status", "REFUSED", "code", "OUT_OF_SCOPE", "answer", refused.answer(),
                "policyVersion", QuestionScope.VERSION, "modelInvoked", false, "questions", refused.questions(),
                "usage", Map.of("inputTokens", 0, "outputTokens", 0)));
        } catch (ModelGateway.Failure failure) {
            return error(failure.status, failure.code);
        }
    }

    private ResponseEntity<?> error(int status, String code) {
        var response = ResponseEntity.status(status);
        if (status == 429) response.header("Retry-After", "60");
        return response.body(Map.of("status", "ERROR", "code", code));
    }
}
