package dev.kongortfolio.bedrock;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Flow;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.http.ContentStreamProvider;
import software.amazon.awssdk.http.SdkHttpMethod;
import software.amazon.awssdk.http.SdkHttpRequest;
import software.amazon.awssdk.http.auth.aws.signer.AwsV4HttpSigner;
import tools.jackson.databind.ObjectMapper;

@Component
public final class MantleGateway implements ModelGateway, AutoCloseable {
    static final URI ENDPOINT = URI.create("https://bedrock-mantle.ap-northeast-1.api.aws/v1/chat/completions");
    static final String MODEL = "qwen.qwen3-235b-a22b-2507";
    private final BedrockSettings settings;
    private final ObjectMapper mapper;
    private final AwsCredentialsProvider credentials;
    private final HttpClient http;

    @Autowired
    public MantleGateway(BedrockSettings settings, ObjectMapper mapper) {
        this(settings, mapper, DefaultCredentialsProvider.builder().build(), HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build());
    }

    MantleGateway(BedrockSettings settings, ObjectMapper mapper, AwsCredentialsProvider credentials, HttpClient http) {
        this.settings = settings;
        this.mapper = mapper;
        this.credentials = credentials;
        this.http = http;
    }

    @Override public Answer answer(String system, String message) {
        if (!settings.enabled()) throw new Failure(503, "DISABLED");
        CompletableFuture<HttpResponse<byte[]>> pending = null;
        try {
            byte[] body = mapper.writeValueAsBytes(Map.of("model", MODEL, "stream", false,
                "service_tier", "default", "temperature", 0.1, "max_tokens", settings.maxOutputTokens(),
                "messages", List.of(Map.of("role", "system", "content", system), Map.of("role", "user", "content", message))));
            var unsigned = SdkHttpRequest.builder().uri(ENDPOINT).method(SdkHttpMethod.POST)
                .putHeader("Content-Type", "application/json").build();
            var signed = AwsV4HttpSigner.create().sign(r -> r.identity(credentials.resolveCredentials())
                .request(unsigned).payload(ContentStreamProvider.fromByteArray(body))
                .putProperty(AwsV4HttpSigner.SERVICE_SIGNING_NAME, "bedrock-mantle")
                .putProperty(AwsV4HttpSigner.REGION_NAME, "ap-northeast-1"));
            var request = HttpRequest.newBuilder(ENDPOINT).timeout(Duration.ofSeconds(settings.timeoutSeconds()))
                .POST(HttpRequest.BodyPublishers.ofByteArray(body));
            signed.request().headers().forEach((key, values) -> {
                // JDK sets Host/Content-Length from the fixed URI and exact payload.
                if (!key.equalsIgnoreCase("host") && !key.equalsIgnoreCase("content-length")) {
                    values.forEach(value -> request.header(key, value));
                }
            });
            pending = http.sendAsync(request.build(), info -> new BoundedBody());
            var response = pending.get(settings.timeoutSeconds(), TimeUnit.SECONDS);
            if (response.statusCode() == 429) throw new Failure(429, "MODEL_BUSY");
            if (response.statusCode() != 200) throw new Failure(502, "MODEL_UNAVAILABLE");
            var root = mapper.readTree(response.body());
            var choice = root.path("choices").path(0);
            String text = choice.path("message").path("content").asText("");
            String reason = choice.path("finish_reason").asText("");
            if (text.isBlank() || !(reason.equals("stop") || reason.equals("length"))) {
                throw new Failure(502, "INVALID_MODEL_RESPONSE");
            }
            return new Answer(text, reason.equals("length"), root.path("usage").path("prompt_tokens").asInt(0),
                root.path("usage").path("completion_tokens").asInt(0));
        } catch (Failure failure) {
            throw failure;
        } catch (TimeoutException timeout) {
            throw new Failure(504, "MODEL_TIMEOUT");
        } catch (ExecutionException failedRequest) {
            throw new Failure(failedRequest.getCause() instanceof java.net.http.HttpTimeoutException ? 504 : 502,
                failedRequest.getCause() instanceof java.net.http.HttpTimeoutException ? "MODEL_TIMEOUT" : "MODEL_UNAVAILABLE");
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new Failure(503, "REQUEST_INTERRUPTED");
        } catch (Exception failure) {
            throw new Failure(502, "MODEL_UNAVAILABLE");
        } finally {
            if (pending != null && !pending.isDone()) pending.cancel(true);
        }
    }

    @Override public void close() {
        http.close();
        if (credentials instanceof DefaultCredentialsProvider provider) provider.close();
    }

    // Enforce the limit while receiving chunked responses, before allocating an unbounded array.
    static final class BoundedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final CompletableFuture<byte[]> result = new CompletableFuture<>();
        private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        private Flow.Subscription subscription;
        public CompletionStage<byte[]> getBody() { return result; }
        public void onSubscribe(Flow.Subscription value) { subscription = value; value.request(1); }
        public void onNext(List<ByteBuffer> chunks) {
            for (ByteBuffer chunk : chunks) {
                if (bytes.size() + chunk.remaining() > 131072) {
                    subscription.cancel();
                    result.completeExceptionally(new IllegalStateException("Model response too large"));
                    return;
                }
                byte[] data = new byte[chunk.remaining()];
                chunk.get(data);
                bytes.writeBytes(data);
            }
            subscription.request(1);
        }
        public void onError(Throwable failure) { result.completeExceptionally(failure); }
        public void onComplete() { result.complete(bytes.toByteArray()); }
    }
}
