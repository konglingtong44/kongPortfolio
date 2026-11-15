package dev.kongortfolio.bedrock;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class QuestionFactsTest {
    private static final String SNAPSHOT = """
        ## 資料の範囲と回答の基準
        AI回答では資料にない内容を補わない。
        ## 技術スタックと記載上の限界
        AI活用：ChatGPT／Copilotを用いた開発支援。
        メール：mail@example.invalid
        ## 証券システムの移行（2026年8月～）
        ・AIツールを補助的に活用したコード解析と確認
        ## コールセンター（2025年7月～2026年7月）
        ・AI関連技術を調査し、要件への適用可能性を検討
        ・自動化テストツールのPoC支援
        ## 個人開発と現在学習中の領域
        Bedrock Q&Aは未公開。私有S3資料を読み込む。
        Bedrock、LangChain、LangGraphは学習中。本番AIの単独運用責任とは区別する。
        ## 資料にない事項と回答制約
        AIの本番経験を推測しない。
        """;

    @Test void aiContextRetainsSourceFactsAndProjectAttributionWithoutPolicyOrHostingNotes() {
        String selected = QuestionFacts.select("ai-experience", SNAPSHOT);
        assertThat(selected).contains("ChatGPT／Copilot", "証券システムの移行（2026年8月～）",
            "AIツールを補助的に活用", "コールセンター（2025年7月～2026年7月）", "PoC支援",
            "Bedrock、LangChain、LangGraphは学習中。");
        assertThat(selected).doesNotContain("単独運用責任", "未公開", "私有S3", "回答の基準", "回答制約", "example.invalid");
        assertThat(selected.length()).isLessThan(SNAPSHOT.length());
    }

    @Test void otherTopicsRetainTheWholeSnapshotIncludingResponsibilityAndUnknownFacts() {
        assertThat(QuestionFacts.select("leadership", SNAPSHOT)).isSameAs(SNAPSHOT);
        assertThat(QuestionFacts.select("motivation", SNAPSHOT)).isSameAs(SNAPSHOT);
    }

    @Test void unknownAiEvidenceFailsClosedInsteadOfInventingOrUsingUnrelatedFacts() {
        assertThatThrownBy(() -> QuestionFacts.select("ai-experience", "## 連絡先\nmail@example.invalid\n"))
            .isInstanceOf(ModelGateway.Failure.class).hasMessage("FACTS_UNAVAILABLE");
    }
}
