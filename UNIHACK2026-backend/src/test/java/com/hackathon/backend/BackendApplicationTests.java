package com.hackathon.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ActiveProfiles("dev")
@SpringBootTest
class BackendApplicationTests {
    @Autowired WebApplicationContext context;
    @Autowired FilterChainProxy security;

    @Test
    void fixedDevUserWorksWithoutToken() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(security).build();
        mvc.perform(get("/api/v1/users/me")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/users").contentType("application/json")
                        .content("{\"name\":\"Ana\",\"email\":\"ANA@test.com\"}"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/v1/users/me")).andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ana@test.com"));
    }
}
