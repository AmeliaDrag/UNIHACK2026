package com.hackathon.backend;

import com.hackathon.backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"app.frontend-origins=http://localhost:5173", "spring.datasource.url=jdbc:h2:mem:auth-test"})
@ActiveProfiles("auth")
class AuthIntegrationTests {
    @Autowired WebApplicationContext context;
    @Autowired FilterChainProxy security;
    @Autowired UserRepository users;
    @Autowired ObjectMapper mapper;
    @MockitoBean JwtDecoder decoder;
    MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(security).build();
    }

    @Test
    void rejectsMissingAndInvalidTokensAndDisablesManualCreation() throws Exception {
        mvc.perform(get("/api/v1/users/me")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401)).andExpect(jsonPath("$.timestamp").exists());
        when(decoder.decode("bad")).thenThrow(new BadJwtException("invalid"));
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer bad"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error").value("Unauthorized"));
        when(decoder.decode("blocked")).thenReturn(token("blocked", "blocked@example.com", true));
        mvc.perform(post("/api/v1/users").header("Authorization", "Bearer blocked")
                        .contentType("application/json").content("{}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void provisionsDistinctIdentitiesAndPreservesRecipientOnlyAcceptance() throws Exception {
        when(decoder.decode("sender")).thenReturn(token("sender", "Sender@Example.com", true));
        when(decoder.decode("recipient")).thenReturn(token("recipient", "recipient@example.com", true));
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer sender"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value("sender@example.com"));
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer recipient"))
                .andExpect(status().isOk());
        var response = mvc.perform(post("/api/v1/trusted-contacts").header("Authorization", "Bearer sender")
                        .contentType("application/json").content("{\"contactEmail\":\"recipient@example.com\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(response).get("id").asLong();
        mvc.perform(patch("/api/v1/trusted-contacts/" + id + "/accept").header("Authorization", "Bearer sender"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.status").value(403));
        mvc.perform(patch("/api/v1/trusted-contacts/" + id + "/accept").header("Authorization", "Bearer recipient"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACCEPTED"));
        mvc.perform(put("/api/v1/users/me").header("Authorization", "Bearer sender")
                        .contentType("application/json").content("{\"name\":\"Updated\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Updated"));
    }

    @Test
    void rejectsUnverifiedMissingClaimsAndEmailCollisionWithoutLinking() throws Exception {
        when(decoder.decode("unverified")).thenReturn(token("unverified", "unverified@example.com", false));
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer unverified"))
                .andExpect(status().isForbidden());
        assertThat(users.findByEmailIgnoreCase("unverified@example.com")).isEmpty();
        when(decoder.decode("missing")).thenReturn(Jwt.withTokenValue("missing").header("alg", "RS256")
                .issuer("https://test.example/").subject("missing").build());
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer missing"))
                .andExpect(status().isUnauthorized());
        when(decoder.decode("original")).thenReturn(token("original", "collision@example.com", true));
        when(decoder.decode("collision")).thenReturn(token("collision", "collision@example.com", true));
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer original"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer collision"))
                .andExpect(status().isConflict());
        assertThat(users.findByOauthProviderAndOauthSubject("https://test.example/", "collision")).isEmpty();
    }

    @Test
    void allowsOnlyConfiguredCorsOrigin() throws Exception {
        mvc.perform(options("/api/v1/users/me").header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET").header("Access-Control-Request-Headers", "Authorization"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        mvc.perform(options("/api/v1/users/me").header("Origin", "https://untrusted.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.status").value(403))
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    private Jwt token(String subject, String email, boolean verified) {
        return Jwt.withTokenValue(subject).header("alg", "RS256").issuer("https://test.example/")
                .subject(subject).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300))
                .claim("https://unihack-project-api/email", email)
                .claim("https://unihack-project-api/name", "Test User")
                .claim("https://unihack-project-api/email_verified", verified).build();
    }
}
