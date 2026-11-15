package com.hackathon.backend.services;

import com.hackathon.backend.model.entities.UserEntity;
import com.hackathon.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@Profile("dev & !auth")
public class DevCurrentUserService implements CurrentUserService {
    private final UserRepository users;
    private final String email;

    public DevCurrentUserService(UserRepository users, @Value("${app.dev-user-email}") String email) {
        this.users = users;
        this.email = email;
    }

    public UserEntity getCurrentUser() {
        return users.findByEmailIgnoreCase(email).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Development user not found"));
    }
}
