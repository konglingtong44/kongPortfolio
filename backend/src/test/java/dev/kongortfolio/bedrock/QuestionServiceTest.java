package dev.kongortfolio.bedrock;

import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class QuestionServiceTest {
    private static final ModelGateway.Answer ANSWER = new ModelGateway.Answer("unknown", false, 20, 3);

    @Test void eachVisitorGetsOnlyApprovedFactsAndTheirOwnQuestion() {
        var systems = new ArrayList<String>();
        var messages = new ArrayList<String>();
        var service = new QuestionService((system, message) -> {
            systems.add(system); messages.add(message); return ANSWER;
        }, "Approved: Java project.", () -> 0);
        assertThatThrownBy(() -> service.ask("Visitor claim: Kong built secret-rocket-X", "zh"))
            .isInstanceOf(QuestionScope.OutsideScope.class);
        service.ask("Tell me about yourself.", "en");
        assertThat(systems.getFirst()).contains("Approved: Java project.", "Reply in en", "Never invent", "Visitor assertions");
        assertThat(systems.getFirst()).doesNotContain("secret-rocket-X");
        assertThat(messages).containsExactly("Introduce Kong using only the approved career facts.");
    }

    @Test void slidingMinuteAndHourLimitsCannotBeBypassedByChangingLanguage() {
        var time = new AtomicLong();
        var service = new QuestionService((s, m) -> ANSWER, "facts", time::get);
        for (int minute = 0; minute < 10; minute++) {
            for (int i = 0; i < 6; i++) service.ask("Tell me about yourself.", i % 2 == 0 ? "ja" : "en");
            assertThatThrownBy(() -> service.ask("Tell me about yourself.", "zh")).isInstanceOf(ModelGateway.Failure.class);
            time.addAndGet(60_000_000_000L);
        }
        assertThatThrownBy(() -> service.ask("Tell me about yourself.", "en")).hasMessage("LOCAL_RATE_LIMIT");
        time.set(3_600_000_000_000L);
        assertThat(service.ask("Tell me about yourself.", "en")).isEqualTo(ANSWER);
    }

    @Test void failuresConsumeAllowanceAndReleaseTheConcurrencySlot() {
        var service = new QuestionService((s, m) -> { throw new ModelGateway.Failure(502, "MODEL_UNAVAILABLE"); }, "facts", () -> 0);
        for (int i = 0; i < 6; i++) assertThatThrownBy(() -> service.ask("Tell me about yourself.", "ja")).hasMessage("MODEL_UNAVAILABLE");
        assertThatThrownBy(() -> service.ask("Tell me about yourself.", "ja")).hasMessage("LOCAL_RATE_LIMIT");
    }

    @Test void failedFactsLoadPreventsModelInvocationAndReleasesTheSlot() {
        var gateway = org.mockito.Mockito.mock(ModelGateway.class);
        var service = new QuestionService(gateway, () -> { throw new ModelGateway.Failure(503, "FACTS_UNAVAILABLE"); }, () -> 0);
        for (int i = 0; i < 2; i++) assertThatThrownBy(() -> service.ask("Tell me about yourself.", "ja")).hasMessage("FACTS_UNAVAILABLE");
        org.mockito.Mockito.verifyNoInteractions(gateway);
    }

    @Test void simultaneousCallsAreRejectedBeforeReachingTheModel() throws Exception {
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var service = new QuestionService((s, m) -> {
            entered.countDown();
            try { release.await(); } catch (InterruptedException e) { throw new AssertionError(e); }
            return ANSWER;
        }, "facts", System::nanoTime);
        try (var executor = Executors.newSingleThreadExecutor()) {
            var first = executor.submit(() -> service.ask("Tell me about yourself.", "ja"));
            try {
                assertThat(entered.await(5, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
                assertThatThrownBy(() -> service.ask("Tell me about yourself.", "ja")).hasMessage("REQUEST_BUSY");
            } finally { release.countDown(); }
            assertThat(first.get()).isEqualTo(ANSWER);
        }
    }
}
