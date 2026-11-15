package com.hackathon.backend.config;

import com.hackathon.backend.model.TrustedContactStatus;
import com.hackathon.backend.model.entities.MessageEntity;
import com.hackathon.backend.model.entities.TrustedContactEntity;
import com.hackathon.backend.model.entities.UserEntity;
import com.hackathon.backend.repositories.MessageRepository;
import com.hackathon.backend.repositories.TrustedContactRepository;
import com.hackathon.backend.repositories.UserRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * DemoUserProvisioner - Creates hardcoded demo users, friends, and chat messages on startup
 * if demo authentication is enabled.
 */
@Component
public class DemoUserProvisioner {

    private static final Logger log = LoggerFactory.getLogger(DemoUserProvisioner.class);

    private static final String DEMO_USER_SUB = "demo-user-1";
    private static final String DEMO_USER_EMAIL = "miriam@ladymap.app";
    private static final String DEMO_USER_NAME = "Miriam";
    private static final String DEMO_ISSUER = "demo-auth";

    @Value("${app.demo-auth-enabled:false}")
    private boolean demoAuthEnabled;

    private final UserRepository userRepository;
    private final TrustedContactRepository trustedContactRepository;
    private final MessageRepository messageRepository;

    public DemoUserProvisioner(
            UserRepository userRepository,
            TrustedContactRepository trustedContactRepository,
            MessageRepository messageRepository) {
        this.userRepository = userRepository;
        this.trustedContactRepository = trustedContactRepository;
        this.messageRepository = messageRepository;
    }

    @PostConstruct
    @Transactional
    public void provisionDemoUser() {
        if (!demoAuthEnabled) {
            return;
        }

        // ══════════════════════════════════════════════════════════════════════
        // 1. Create main demo user (Miriam)
        // ══════════════════════════════════════════════════════════════════════
        UserEntity miriam = userRepository
                .findByOauthProviderAndOauthSubject(DEMO_ISSUER, DEMO_USER_SUB)
                .orElseGet(() -> {
                    UserEntity newUser = UserEntity.builder()
                            .oauthProvider(DEMO_ISSUER)
                            .oauthSubject(DEMO_USER_SUB)
                            .email(DEMO_USER_EMAIL)
                            .name(DEMO_USER_NAME)
                            .phoneNumber("+40712345678")
                            .wingColor("#c62828") // Red wings
                            .dotColor("#111111")  // Black dots
                            .build();
                    userRepository.saveAndFlush(newUser);
                    log.info("[Hardcoded Auth] ✓ Created demo user: {} ({})", DEMO_USER_NAME, DEMO_USER_EMAIL);
                    return newUser;
                });

        // ══════════════════════════════════════════════════════════════════════
        // 2. Create friend users (if they don't exist)
        // ══════════════════════════════════════════════════════════════════════
        UserEntity amelia = createFriendIfNotExists(
                "demo-friend-1", "amelia@ladymap.app", "Amelia",
                "+40723456789", "#e91e8c", "#ffffff"
        );

        UserEntity deborah = createFriendIfNotExists(
                "demo-friend-2", "deborah@ladymap.app", "Deborah",
                "+40734567890", "#ff9800", "#111111"
        );

        UserEntity lara = createFriendIfNotExists(
                "demo-friend-3", "lara@ladymap.app", "Lara",
                "+40745678901", "#43a047", "#ffffff"
        );

        UserEntity sofia = createFriendIfNotExists(
                "demo-friend-4", "sofia@ladymap.app", "Sofia",
                "+40756789012", "#8e24aa", "#fdd835"
        );

        // ══════════════════════════════════════════════════════════════════════
        // 3. Create accepted trusted contacts (bidirectional friendships)
        // ══════════════════════════════════════════════════════════════════════
        createAcceptedContactIfNotExists(miriam, amelia);
        createAcceptedContactIfNotExists(miriam, deborah);
        createAcceptedContactIfNotExists(miriam, lara);
        createAcceptedContactIfNotExists(miriam, sofia);

        // ══════════════════════════════════════════════════════════════════════
        // 4. Seed sample chat messages (if chat is empty)
        // ══════════════════════════════════════════════════════════════════════
        seedChatMessages(miriam, amelia, deborah, lara);

        log.info("[Hardcoded Auth] ✓ Demo data provisioning complete.");
    }

    private UserEntity createFriendIfNotExists(
            String sub, String email, String name,
            String phone, String wingColor, String dotColor) {
        return userRepository.findByOauthProviderAndOauthSubject(DEMO_ISSUER, sub)
                .orElseGet(() -> {
                    UserEntity friend = UserEntity.builder()
                            .oauthProvider(DEMO_ISSUER)
                            .oauthSubject(sub)
                            .email(email)
                            .name(name)
                            .phoneNumber(phone)
                            .wingColor(wingColor)
                            .dotColor(dotColor)
                            .build();
                    userRepository.saveAndFlush(friend);
                    log.info("[Hardcoded Auth] ✓ Created friend: {} ({})", name, email);
                    return friend;
                });
    }

    private void createAcceptedContactIfNotExists(UserEntity user, UserEntity friend) {
        // Check if friendship already exists in either direction
        boolean exists = trustedContactRepository.existsByUserIdAndContactUserId(user.getId(), friend.getId())
                || trustedContactRepository.existsByUserIdAndContactUserId(friend.getId(), user.getId());

        if (!exists) {
            // Create bidirectional accepted contacts
            TrustedContactEntity contact1 = TrustedContactEntity.builder()
                    .user(user)
                    .contactUser(friend)
                    .status(TrustedContactStatus.ACCEPTED)
                    .build();

            TrustedContactEntity contact2 = TrustedContactEntity.builder()
                    .user(friend)
                    .contactUser(user)
                    .status(TrustedContactStatus.ACCEPTED)
                    .build();

            trustedContactRepository.saveAndFlush(contact1);
            trustedContactRepository.saveAndFlush(contact2);
            log.info("[Hardcoded Auth] ✓ Linked {} ↔ {}", user.getName(), friend.getName());
        }
    }

    private void seedChatMessages(UserEntity miriam, UserEntity amelia, UserEntity deborah, UserEntity lara) {
        // Only seed if no messages exist yet
        if (!messageRepository.findAll().isEmpty()) {
            log.info("[Hardcoded Auth] Chat messages already exist, skipping seeding.");
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        // Conversation with Amelia (most recent)
        createMessage(amelia, miriam, "Hey Miriam! Are you free tomorrow?", now.minusHours(2));
        createMessage(miriam, amelia, "Yes! What's up?", now.minusHours(2).plusMinutes(5));
        createMessage(amelia, miriam, "Want to go for a walk in the park? The weather looks great!", now.minusHours(1).plusMinutes(30));
        createMessage(miriam, amelia, "Sounds perfect! Let's meet at 3 PM 🌸", now.minusHours(1).plusMinutes(35));

        // Conversation with Deborah
        createMessage(miriam, deborah, "Thanks for helping me with the app yesterday!", now.minusDays(1).minusHours(3));
        createMessage(deborah, miriam, "No problem! How's it working now?", now.minusDays(1).minusHours(2));
        createMessage(miriam, deborah, "Perfect! The map features are amazing 🗺️", now.minusDays(1).minusHours(1).plusMinutes(45));

        // Conversation with Lara
        createMessage(lara, miriam, "Did you see the new safety report near the university?", now.minusDays(2).minusHours(5));
        createMessage(miriam, lara, "Yes! Good to know. Thanks for sharing 💚", now.minusDays(2).minusHours(4).plusMinutes(30));

        log.info("[Hardcoded Auth] ✓ Seeded sample chat messages.");
    }

    private void createMessage(UserEntity sender, UserEntity recipient, String text, LocalDateTime timestamp) {
        MessageEntity message = MessageEntity.builder()
                .sender(sender)
                .recipient(recipient)
                .text(text)
                .build();
        // Manually set timestamp (bypass @PrePersist)
        message.setCreatedAt(timestamp);
        messageRepository.save(message);
    }
}
