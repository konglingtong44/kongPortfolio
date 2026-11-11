package dev.kongortfolio;

import dev.kongortfolio.profile.ProfileService;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.assertThat;

class LocalProfileReloadTest {
    @TempDir Path directory;

    @Test void localPreviewReadsUpdatedPublicContentWithoutRestart() throws Exception {
        for (String language : new String[] {"ja", "zh", "en"}) {
            try (var stream = getClass().getResourceAsStream("/content/profile-" + language + ".json")) {
                Files.copy(stream, directory.resolve("profile-" + language + ".json"));
            }
        }
        var service = new ProfileService(new ObjectMapper(), directory.toString());
        var file = directory.resolve("profile-ja.json");
        assertThat(service.find("ja").introduction()).doesNotStartWith("Updated: ");
        Files.writeString(file, Files.readString(file).replace("\"introduction\": \"", "\"introduction\": \"Updated: "));
        assertThat(service.find("ja").introduction()).startsWith("Updated: ");
        assertThat(service.find("../../other").introduction()).isEqualTo(service.find("ja").introduction());
        assertThat(service.find("zh").introduction()).doesNotStartWith("Updated: ");
    }

    @Test void packagedModeKeepsClasspathContent() {
        var service = new ProfileService(new ObjectMapper(), "");
        assertThat(service.find("ja").introduction()).contains("LangGraph");
        assertThat(service.find("en").introduction()).contains("eight years");
    }
}
