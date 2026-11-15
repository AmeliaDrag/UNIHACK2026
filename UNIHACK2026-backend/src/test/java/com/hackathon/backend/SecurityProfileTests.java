package com.hackathon.backend;

import com.hackathon.backend.config.SecurityProfileConfig;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import static org.assertj.core.api.Assertions.*;

class SecurityProfileTests {
    @Test
    void rejectsMissingAndConflictingProfiles() {
        for (String[] profiles : new String[][] { {}, {"dev", "auth"} }) {
            try (var context = new AnnotationConfigApplicationContext()) {
                context.getEnvironment().setActiveProfiles(profiles);
                context.register(SecurityProfileConfig.class);
                assertThatThrownBy(context::refresh).hasMessageContaining("Activate exactly one security profile");
            }
        }
    }
}
