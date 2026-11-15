package com.hackathon.backend.repositories;

import com.hackathon.backend.model.entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    Optional<UserEntity> findByOauthProviderAndOauthSubject(
            String oauthProvider,
            String oauthSubject
    );
}
