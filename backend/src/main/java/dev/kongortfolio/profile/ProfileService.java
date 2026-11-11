package dev.kongortfolio.profile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import tools.jackson.databind.ObjectMapper;

@Service
public class ProfileService {
    private final Map<String, Profile> profiles;
    private final Path contentDirectory;
    private final ObjectMapper mapper;

    public ProfileService(ObjectMapper mapper, @Value("${portfolio.content-directory:}") String directory) {
        this.mapper = mapper;
        this.contentDirectory = directory.isBlank() ? null : Path.of(directory).toAbsolutePath().normalize();
        if (contentDirectory != null && !Files.isDirectory(contentDirectory)) {
            throw new IllegalArgumentException("Local public content directory does not exist");
        }
        Map<String, Profile> content = new HashMap<>();
        for (String locale : new String[] {"ja", "zh", "en"}) {
            try (var stream = new ClassPathResource("content/profile-" + locale + ".json").getInputStream()) {
                content.put(locale, mapper.readValue(stream, Profile.class));
            } catch (IOException exception) {
                throw new UncheckedIOException("Could not read public portfolio content: " + locale, exception);
            }
        }
        profiles = Map.copyOf(content);
    }

    public Profile find(String language) {
        String base = language == null ? "ja" : language.toLowerCase(Locale.ROOT).split("[-_]", 2)[0];
        String locale = profiles.containsKey(base) ? base : "ja";
        if (contentDirectory != null) {
            try (var stream = Files.newInputStream(contentDirectory.resolve("profile-" + locale + ".json"))) {
                return mapper.readValue(stream, Profile.class);
            } catch (IOException exception) {
                throw new UncheckedIOException("Could not read local public profile: " + locale, exception);
            }
        }
        return profiles.get(locale);
    }
}
