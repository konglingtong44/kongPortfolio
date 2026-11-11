package dev.kongortfolio.profile;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProfileController {
    private final ProfileService profiles;

    public ProfileController(ProfileService profiles) { this.profiles = profiles; }

    @GetMapping("/api/profile")
    public Profile profile(@RequestParam(defaultValue = "ja") String lang) {
        return profiles.find(lang);
    }
}
