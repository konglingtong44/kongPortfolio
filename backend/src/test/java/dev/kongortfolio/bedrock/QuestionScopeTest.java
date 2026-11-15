package dev.kongortfolio.bedrock;

import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class QuestionScopeTest {
    @Test void examplesAreLocalizedSuggestionsIncludingRequirementsNotAQuestionWhitelist() {
        for (String language : List.of("ja", "zh", "en")) {
            var choices = QuestionScope.choices(language);
            assertThat(choices).hasSize(18);
            assertThat(choices.stream().map(QuestionScope.Choice::id)).contains("requirements", "skills").doesNotContain("contacts", "algorithm");
            assertThat(choices.stream().map(QuestionScope.Choice::id).distinct()).hasSize(18);
        }
        assertThat(QuestionScope.choices("invalid")).isEqualTo(QuestionScope.choices("ja"));
        assertThat(QuestionScope.refusal("zh")).contains("自然提问", "工作方法");
    }
}
