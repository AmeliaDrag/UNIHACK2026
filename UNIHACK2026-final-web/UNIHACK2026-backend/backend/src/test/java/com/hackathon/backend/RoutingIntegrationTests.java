package com.hackathon.backend;

import com.hackathon.backend.model.entities.*;
import com.hackathon.backend.model.ReportType;
import com.hackathon.backend.repositories.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.security.web.FilterChainProxy;
import java.time.LocalDateTime;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"ors.api-key=", "spring.datasource.url=jdbc:h2:mem:routing-tests"})
@ActiveProfiles("dev")
class RoutingIntegrationTests {
    @Autowired ReportRepository reports;
    @Autowired UserRepository users;
    @Autowired WebApplicationContext context;
    @Autowired FilterChainProxy security;
    @Test void queryExcludesExpiredAndDistantReports() {
        var user = users.saveAndFlush(UserEntity.builder().name("Routing Test").email("routing@example.com").build());
        var active = reports.saveAndFlush(ReportEntity.builder().user(user).type(ReportType.OTHER)
                .latitude(45.75).longitude(21.22).build());
        var expired = reports.saveAndFlush(ReportEntity.builder().user(user).type(ReportType.OTHER)
                .latitude(45.751).longitude(21.221).build());
        expired.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        reports.saveAndFlush(expired);
        reports.saveAndFlush(ReportEntity.builder().user(user).type(ReportType.OTHER).latitude(40.0).longitude(20.0).build());
        assertThat(reports.findActiveInBounds(LocalDateTime.now(),45.7,45.8,21.2,21.3))
                .extracting(ReportEntity::getId).containsExactly(active.getId());
    }
    @Test void endpointValidatesAndReturnsClearMissingKeyError() throws Exception {
        var mvc=MockMvcBuilders.webAppContextSetup(context).addFilters(security).build();
        mvc.perform(post("/api/v1/routes").contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.validationErrors").exists());
        mvc.perform(post("/api/v1/routes").contentType("application/json").content("""
                {"origin":{"latitude":45.7489,"longitude":21.2257},
                 "destination":{"latitude":45.7542,"longitude":21.2315}}
                """))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.message").value("Routing is not configured: set ORS_API_KEY"));
    }
}
