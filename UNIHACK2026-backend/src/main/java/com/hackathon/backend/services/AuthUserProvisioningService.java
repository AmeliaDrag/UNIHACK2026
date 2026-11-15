package com.hackathon.backend.services;

import com.hackathon.backend.model.entities.UserEntity;
import com.hackathon.backend.repositories.UserRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
@Profile("auth & !dev")
public class AuthUserProvisioningService {
    public static final String CLAIM_PREFIX = "https://unihack-project-api/";
    private final UserRepository users;
    private final TransactionTemplate transaction;

    public AuthUserProvisioningService(UserRepository users, PlatformTransactionManager manager) {
        this.users = users;
        this.transaction = new TransactionTemplate(manager);
        // Provisioning must also work when invoked by a read-only business service.
        this.transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public UserEntity resolve(Jwt jwt) {
        String issuer = requiredString(jwt.getClaims().get("iss"), 255);
        String subject = requiredString(jwt.getClaims().get("sub"), 255);
        try {
            return transaction.execute(status -> users.findByOauthProviderAndOauthSubject(issuer, subject)
                    .orElseGet(() -> provision(jwt, issuer, subject)));
        } catch (DataIntegrityViolationException ex) {
            // The failed insert has rolled back before retrying a concurrent identity lookup.
            return transaction.execute(status -> users.findByOauthProviderAndOauthSubject(issuer, subject)
                    .orElseThrow(AuthUserProvisioningService::conflict));
        }
    }

    private UserEntity provision(Jwt jwt, String issuer, String subject) {
        String email = requiredString(jwt.getClaims().get(CLAIM_PREFIX + "email"), 255)
                .trim().toLowerCase(Locale.ROOT);
        String name = requiredString(jwt.getClaims().get(CLAIM_PREFIX + "name"), 100).trim();
        if (!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid identity email claim");
        }
        if (!Boolean.TRUE.equals(jwt.getClaims().get(CLAIM_PREFIX + "email_verified"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Verified email required for provisioning");
        }
        if (users.existsByEmailIgnoreCase(email)) {
            throw conflict();
        }
        return users.saveAndFlush(UserEntity.builder().oauthProvider(issuer).oauthSubject(subject)
                .email(email).name(name).build());
    }

    private static String requiredString(Object value, int maxLength) {
        if (!(value instanceof String text) || text.isBlank() || text.length() > maxLength) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing or invalid identity claims");
        }
        return text;
    }

    private static ResponseStatusException conflict() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "Identity conflicts with an existing account");
    }
}
