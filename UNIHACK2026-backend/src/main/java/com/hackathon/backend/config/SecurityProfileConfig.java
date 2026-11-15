package com.hackathon.backend.config;

import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

@Configuration
public class SecurityProfileConfig {
    @Bean
    static BeanFactoryPostProcessor requireSecurityProfile(Environment environment) {
        return factory -> {
            boolean dev = environment.acceptsProfiles(Profiles.of("dev"));
            boolean auth = environment.acceptsProfiles(Profiles.of("auth"));
            if (dev == auth) {
                throw new IllegalStateException("Activate exactly one security profile: dev or auth");
            }
        };
    }
}
