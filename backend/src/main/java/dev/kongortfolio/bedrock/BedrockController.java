package dev.kongortfolio.bedrock;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BedrockController {
    @PostMapping("/api/bedrock")
    public BedrockResponse prepare() {
        // Testing placeholder only; no Amazon Bedrock invocation yet.
        return new BedrockResponse("PREPARING");
    }

    public record BedrockResponse(String status) {}
}
