package dev.kongortfolio.bedrock;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Flow;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.auth.credentials.AwsSessionCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MantleGatewayTest {
    private final HttpClient http = mock(HttpClient.class);
    private final MantleGateway gateway = new MantleGateway(new BedrockSettings(true, 512, 1), new ObjectMapper(),
        StaticCredentialsProvider.create(AwsSessionCredentials.create("synthetic-id", "synthetic-secret", "synthetic-session")), http);

    @SuppressWarnings("unchecked")
    private void respond(int status, String body) {
        HttpResponse<byte[]> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(body.getBytes(StandardCharsets.UTF_8));
        when(http.sendAsync(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
            .thenReturn(CompletableFuture.completedFuture(response));
    }

    @Test void signsForTokyoMantleAndParsesUsageAndTruncation() throws Exception {
        respond(200, """
            {"choices":[{"message":{"content":"answer"},"finish_reason":"length"}],
             "usage":{"prompt_tokens":123,"completion_tokens":512}}
            """);
        var answer = gateway.answer("approved facts", "question");
        assertThat(answer).isEqualTo(new ModelGateway.Answer("answer", true, 123, 512));
        var request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(http, times(1)).sendAsync(request.capture(), any());
        assertThat(request.getValue().uri()).isEqualTo(MantleGateway.ENDPOINT);
        assertThat(request.getValue().headers().firstValue("Authorization").orElseThrow())
            .contains("/ap-northeast-1/bedrock-mantle/aws4_request");
        assertThat(request.getValue().headers().firstValue("x-amz-security-token")).contains("synthetic-session");
        var subscriber = HttpResponse.BodySubscribers.ofByteArray();
        request.getValue().bodyPublisher().orElseThrow().subscribe(new Flow.Subscriber<ByteBuffer>() {
            public void onSubscribe(Flow.Subscription s) { subscriber.onSubscribe(s); }
            public void onNext(ByteBuffer data) { subscriber.onNext(List.of(data)); }
            public void onError(Throwable failure) { subscriber.onError(failure); }
            public void onComplete() { subscriber.onComplete(); }
        });
        var payload = new ObjectMapper().readTree(subscriber.getBody().toCompletableFuture().get());
        assertThat(payload.path("model").asText()).isEqualTo(MantleGateway.MODEL);
        assertThat(payload.path("service_tier").asText()).isEqualTo("default");
        assertThat(payload.path("stream").asBoolean()).isFalse();
        assertThat(payload.path("max_tokens").asInt()).isEqualTo(512);
        assertThat(payload.path("messages").size()).isEqualTo(2);
    }

    @Test void upstreamErrorsAreRedactedAndNeverRetried() {
        for (int status : new int[] {403, 429, 500}) {
            reset(http);
            respond(status, "private-upstream-prompt-or-token");
            assertThatThrownBy(() -> gateway.answer("facts", "question"))
                .isInstanceOf(ModelGateway.Failure.class).hasMessage(status == 429 ? "MODEL_BUSY" : "MODEL_UNAVAILABLE");
            verify(http, times(1)).sendAsync(any(), any());
        }
    }

    @Test void invalidOrFilteredResponsesDoNotBecomeSuccessfulAnswers() {
        for (String body : new String[] {"not JSON", "{}", "{\"choices\":[{\"message\":{\"content\":\"unsafe\"},\"finish_reason\":\"content_filter\"}]}"}) {
            respond(200, body);
            assertThatThrownBy(() -> gateway.answer("facts", "question")).isInstanceOf(ModelGateway.Failure.class);
        }
    }

    @Test void timeoutCancelsThePendingRequest() {
        var pending = new CompletableFuture<HttpResponse<byte[]>>();
        when(http.sendAsync(any(), any(HttpResponse.BodyHandler.class))).thenReturn(pending);
        assertThatThrownBy(() -> gateway.answer("facts", "question")).hasMessage("MODEL_TIMEOUT");
        assertThat(pending.isCancelled()).isTrue();
    }

    @Test void transportTimeoutAlsoMapsToGatewayTimeout() {
        when(http.sendAsync(any(), any(HttpResponse.BodyHandler.class)))
            .thenReturn(CompletableFuture.failedFuture(new java.net.http.HttpTimeoutException("synthetic")));
        assertThatThrownBy(() -> gateway.answer("facts", "question")).hasMessage("MODEL_TIMEOUT");
    }

    @Test void chunkedResponseLimitCancelsBeforeBufferingOversizedChunks() {
        var body = new MantleGateway.BoundedBody();
        var subscription = mock(Flow.Subscription.class);
        body.onSubscribe(subscription);
        body.onNext(List.of(ByteBuffer.wrap(new byte[131073])));
        verify(subscription).cancel();
        assertThat(body.getBody().toCompletableFuture().isCompletedExceptionally()).isTrue();
    }

    @Test void disabledClientNeverResolvesCredentialsOrSendsHttp() {
        var credentials = mock(software.amazon.awssdk.auth.credentials.AwsCredentialsProvider.class);
        var disabled = new MantleGateway(new BedrockSettings(false, 512, 1), new ObjectMapper(), credentials, http);
        assertThatThrownBy(() -> disabled.answer("facts", "question")).hasMessage("DISABLED");
        verifyNoInteractions(credentials, http);
        assertThatThrownBy(() -> new BedrockSettings(true, 8192, 20)).isInstanceOf(IllegalArgumentException.class);
    }
}
