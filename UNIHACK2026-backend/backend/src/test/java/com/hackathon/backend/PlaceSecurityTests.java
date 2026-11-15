package com.hackathon.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.frontend-origins=http://localhost:5173", "spring.datasource.url=jdbc:h2:mem:places-test"})
@ActiveProfiles("auth")
class PlaceSecurityTests {
    @Autowired WebApplicationContext context;
    @Autowired FilterChainProxy security;
    @Test void authRequiresToken() throws Exception {
        MockMvcBuilders.webAppContextSetup(context).addFilters(security).build()
                .perform(get("/api/v1/places/open-24-7"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401));
    }
}
