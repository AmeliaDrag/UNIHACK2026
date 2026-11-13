package com.hackathon.backend.services;

import com.hackathon.backend.model.entities.UserEntity;
import com.hackathon.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@Profile("dev")
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    @Value("${app.dev-user-email}")
    private String devUserEmail;

    public UserEntity getCurrentUser() {
        return userRepository.findByEmailIgnoreCase(devUserEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Development user not found"
                ));
    }
}