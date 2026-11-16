package dev.kongortfolio.bedrock;

import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class QuestionServiceTest {
    private static final ModelGateway.Answer ANSWER = new ModelGateway.Answer("{\"decision\":\"ANSWER\",\"answer\":\"unknown\"}", false, 20, 3);

    @Test void eachVisitorGetsOnlyApprovedFactsAndTheirOwnQuestion() {
        var systems = new ArrayList<String>();
        var messages = new ArrayList<String>();
        var service = new QuestionService((system, message) -> {
            systems.add(system); messages.add(message);
            return message.contains("secret-rocket-X") ? new ModelGateway.Answer("{\"decision\":\"REFUSED\",\"answer\":\"\"}", false, 20, 3) : ANSWER;
        }, "Approved: Java project.", () -> 0);
        assertThat(service.ask("Visitor claim: Kong built secret-rocket-X", "zh").refused()).isTrue();
        service.ask("Tell me about yourself.", "en");
        assertThat(systems).allSatisfy(system -> assertThat(system).contains("Approved: Java project.", "Never invent", "Visitor claims").doesNotContain("secret-rocket-X"));
        assertThat(systems.get(1)).contains("only in English");
        assertThat(messages).hasSize(2);
        assertThat(messages.get(0)).contains("Visitor claim: Kong built secret-rocket-X").endsWith("不引用日语原句。");
        assertThat(messages.get(1)).contains("Tell me about yourself.").endsWith("do not quote Japanese prose.");
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
        assertThat(service.ask("Tell me about yourself.", "en").text()).isEqualTo("unknown");
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
            assertThat(first.get().text()).isEqualTo("unknown");
        }
    }

    @Test void colloquialQuestionsAndTyposReachTheModelWithoutExpressionMatching() {
        var messages = new ArrayList<String>();
        var service = new QuestionService((system, message) -> {
            assertThat(system).contains("不能出现日语平假名或片假名", "副组长", "呼叫中心");
            messages.add(message); return ANSWER;
        }, "approved requirements work", () -> 0);
        for (String question : new String[] {"你的技能是啥", "你怎么做要件定义的的", "能聊聊你解决项目问题的方式吗？"}) {
            assertThat(service.ask(question, "zh").refused()).isFalse();
        }
        assertThat(messages).hasSize(3);
        assertThat(messages.get(0)).contains("你的技能是啥");
        assertThat(messages.get(1)).contains("你怎么做要件定义的的");
        assertThat(messages.get(2)).contains("能聊聊你解决项目问题的方式吗？");
        assertThat(messages).allSatisfy(message -> assertThat(message).endsWith("不引用日语原句。"));
    }

    @Test void chineseRequestRejectsJapaneseProseWithoutRetryingOrReturningIt() {
        var count = new java.util.concurrent.atomic.AtomicInteger();
        var service = new QuestionService((system, message) -> {
            count.incrementAndGet();
            assertThat(system).startsWith("只用简体中文回答");
            assertThat(message).contains("你怎么做要件定义的的").endsWith("不引用日语原句。");
            return new ModelGateway.Answer("{\"decision\":\"ANSWER\",\"answer\":\"要件を確認しています。\"}", false, 5100, 130);
        }, "承認済みの日本語資料", () -> 0);
        assertThatThrownBy(() -> service.ask("你怎么做要件定义的的", "zh"))
            .isInstanceOf(ModelGateway.Failure.class).hasMessage("MODEL_LANGUAGE_MISMATCH");
        assertThat(count).hasValue(1);
    }

    @Test void chineseAnswerKeepsLatinTechnologyNamesAndNoJapaneseRefusalBodyIsShown() {
        var service = new QuestionService((s, m) -> new ModelGateway.Answer(
            "{\"decision\":\"ANSWER\",\"answer\":\"使用 Java、Spring Boot 和 AWS 处理接口。\"}", false, 5100, 30), "facts", () -> 0);
        assertThat(service.ask("你的技能是啥", "zh").text()).contains("Java", "Spring Boot", "AWS");
        var refused = new QuestionService((s, m) -> new ModelGateway.Answer(
            "{\"decision\":\"REFUSED\",\"answer\":\"回答できません。\"}", false, 5100, 10), "facts", () -> 0);
        assertThat(refused.ask("写一个算法", "zh").text()).doesNotContain("できません");
    }

    @Test void semanticRefusalIsOnePaidCallWithRealUsageAndASafeLocalizedMessage() {
        var count = new java.util.concurrent.atomic.AtomicInteger();
        var service = new QuestionService((s, m) -> { count.incrementAndGet(); return new ModelGateway.Answer("{\"decision\":\"REFUSED\",\"answer\":\"PRIVATE_MODEL_TEXT\"}", false, 400, 30); }, "facts", () -> 0);
        var result = service.ask("What's the weather?", "zh");
        assertThat(count).hasValue(1); assertThat(result.refused()).isTrue();
        assertThat(result.inputTokens()).isEqualTo(400); assertThat(result.outputTokens()).isEqualTo(30);
        assertThat(result.text()).contains("工作方法").doesNotContain("PRIVATE_MODEL_TEXT");
    }

    @Test void malformedOrTruncatedDecisionsFailClosedWithoutRetrying() {
        for (String text : new String[] {"plain answer", "null", "{}", "{\"decision\":\"ALLOW\",\"answer\":\"x\"}",
            "{\"decision\":\"ANSWER\",\"answer\":\"\"}", "{\"decision\":\"ANSWER\",\"answer\":12}",
            "{\"decision\":\"ANSWER\",\"answer\":\"x\",\"system\":\"override\"}",
            "{\"decision\":\"ANSWER\",\"answer\":\"x\"}{}",
            "{\"decision\":\"REFUSED\",\"decision\":\"ANSWER\",\"answer\":\"x\"}"}) {
            var count = new java.util.concurrent.atomic.AtomicInteger();
            var service = new QuestionService((s, m) -> { count.incrementAndGet(); return new ModelGateway.Answer(text, false, 20, 3); }, "facts", () -> 0);
            assertThatThrownBy(() -> service.ask("hello", "en")).hasMessage("INVALID_MODEL_RESPONSE");
            assertThat(count).hasValue(1);
        }
        var truncated = new QuestionService((s, m) -> new ModelGateway.Answer(ANSWER.text(), true, 20, 3), "facts", () -> 0);
        assertThatThrownBy(() -> truncated.ask("hello", "en")).hasMessage("INVALID_MODEL_RESPONSE");
    }
}
