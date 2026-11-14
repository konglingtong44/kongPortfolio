package dev.kongortfolio.bedrock;

public interface ModelGateway {
    Answer answer(String system, String message);

    record Answer(String text, boolean truncated, int inputTokens, int outputTokens) {}

    final class Failure extends RuntimeException {
        public final int status;
        public final String code;
        public Failure(int status, String code) {
            super(code); // Do not retain upstream bodies, prompts or credentials.
            this.status = status;
            this.code = code;
        }
    }
}
