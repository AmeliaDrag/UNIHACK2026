package com.hackathon.backend;
import com.hackathon.backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.ObjectMapper;
import java.time.Instant;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties = {"app.frontend-origins=http://localhost:5173", "spring.datasource.url=jdbc:h2:mem:chat-test"})
@ActiveProfiles("auth")
class ChatIntegrationTests {
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
    void acceptedFriendsCanChatAndFriendListHidesPrivateFields() throws Exception {
        login("ca"); login("cb");
        long a = idOf("ca"), b = idOf("cb");
        befriend("ca", "cb", true);
        mvc.perform(post("/api/v1/messages").header("Authorization", "Bearer ca")
                        .contentType("application/json")
                        .content("{\"recipientId\":" + b + ",\"text\":\"  hello  \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.senderId").value(a))
                .andExpect(jsonPath("$.recipientId").value(b))
                .andExpect(jsonPath("$.text").value("hello"));
        mvc.perform(get("/api/v1/messages/with/" + a).header("Authorization", "Bearer cb"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].text").value("hello"));
        mvc.perform(get("/api/v1/messages/with/" + a + "?afterId=999999").header("Authorization", "Bearer cb"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/friends").header("Authorization", "Bearer cb"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(a))
                .andExpect(jsonPath("$[0].name").exists())
                .andExpect(jsonPath("$[0].email").doesNotExist())
                .andExpect(jsonPath("$[0].phoneNumber").doesNotExist());
    }
    @Test
    void nonFriendsGetForbidden() throws Exception {
        login("na"); login("nb");
        long b = idOf("nb");
        mvc.perform(post("/api/v1/messages").header("Authorization", "Bearer na")
                        .contentType("application/json")
                        .content("{\"recipientId\":" + b + ",\"text\":\"hi\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/messages/with/" + b).header("Authorization", "Bearer na"))
                .andExpect(status().isForbidden());
    }
    @Test
    void pendingContactsGetForbidden() throws Exception {
        login("pa"); login("pb");
        long b = idOf("pb");
        befriend("pa", "pb", false); // invitation sent but NOT accepted
        mvc.perform(post("/api/v1/messages").header("Authorization", "Bearer pa")
                        .contentType("application/json")
                        .content("{\"recipientId\":" + b + ",\"text\":\"hi\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/messages/with/" + b).header("Authorization", "Bearer pa"))
                .andExpect(status().isForbidden());
    }
    @Test
    void ladybugColorsAreSharedWithFriendsAndValidated() throws Exception {
        login("la"); login("lb");
        long a = idOf("la");
        befriend("la", "lb", true);
        mvc.perform(put("/api/v1/users/me").header("Authorization", "Bearer la")
                        .contentType("application/json")
                        .content("{\"wingColor\":\"#FF0000\",\"dotColor\":\"#00AAFF\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.wingColor").value("#ff0000"))
                .andExpect(jsonPath("$.dotColor").value("#00aaff"));
        mvc.perform(get("/api/v1/friends").header("Authorization", "Bearer lb"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(a))
                .andExpect(jsonPath("$[0].wingColor").value("#ff0000"))
                .andExpect(jsonPath("$[0].dotColor").value("#00aaff"));
        mvc.perform(get("/api/v1/trusted-contacts/received").header("Authorization", "Bearer lb"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].userWingColor").value("#ff0000"));
        mvc.perform(put("/api/v1/users/me").header("Authorization", "Bearer la")
                        .contentType("application/json").content("{\"wingColor\":\"red\"}"))
                .andExpect(status().isBadRequest());
    }
    @Test
    void receivedEndpointListsOnlyMessagesAddressedToMe() throws Exception {
        login("ra"); login("rb");
        long b = idOf("rb");
        befriend("ra", "rb", true);
        var sent = mvc.perform(post("/api/v1/messages").header("Authorization", "Bearer ra")
                        .contentType("application/json")
                        .content("{\"recipientId\":" + b + ",\"text\":\"ping\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(sent).get("id").asLong();
        mvc.perform(get("/api/v1/messages/received").header("Authorization", "Bearer rb"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].text").value("ping"));
        mvc.perform(get("/api/v1/messages/received?afterId=" + id).header("Authorization", "Bearer rb"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/v1/messages/received").header("Authorization", "Bearer ra"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }
    // ---- helpers ----
    private void login(String sub) throws Exception {
        when(decoder.decode(sub)).thenReturn(token(sub));
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + sub)).andExpect(status().isOk());
    }
    private long idOf(String sub) {
        return users.findByEmailIgnoreCase(sub + "@example.com").orElseThrow().getId();
    }
    private void befriend(String from, String to, boolean accept) throws Exception {
        var body = mvc.perform(post("/api/v1/trusted-contacts").header("Authorization", "Bearer " + from)
                        .contentType("application/json").content("{\"contactEmail\":\"" + to + "@example.com\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        if (accept) {
            long id = mapper.readTree(body).get("id").asLong();
            mvc.perform(patch("/api/v1/trusted-contacts/" + id + "/accept").header("Authorization", "Bearer " + to))
                    .andExpect(status().isOk());
        }
    }
    private Jwt token(String sub) {
        return Jwt.withTokenValue(sub).header("alg", "RS256").issuer("https://test.example/")
                .subject(sub).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300))
                .claim("https://unihack-project-api/email", sub + "@example.com")
                .claim("https://unihack-project-api/name", "User " + sub)
                .claim("https://unihack-project-api/email_verified", true).build();
    }
}