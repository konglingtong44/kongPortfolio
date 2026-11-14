package dev.kongortfolio.bedrock;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public record BedrockSettings(boolean enabled, int maxOutputTokens, int timeoutSeconds) {
    public BedrockSettings(
        @Value("${portfolio.bedrock.enabled:false}") boolean enabled,
        @Value("${portfolio.bedrock.max-output-tokens:2048}") int maxOutputTokens,
        @Value("${portfolio.bedrock.timeout-seconds:20}") int timeoutSeconds) {
        if (maxOutputTokens < 16 || maxOutputTokens > 2048 || timeoutSeconds < 1 || timeoutSeconds > 20) {
            throw new IllegalArgumentException("Bedrock limits exceed the reviewed bounds");
        }
        this.enabled = enabled;
        this.maxOutputTokens = maxOutputTokens;
        this.timeoutSeconds = timeoutSeconds;
    }
}
