package com.hackathon.backend.repositories;

import com.hackathon.backend.model.TrustedContactStatus;
import com.hackathon.backend.model.entities.TrustedContactEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrustedContactRepository
        extends JpaRepository<TrustedContactEntity, Long> {

    @EntityGraph(attributePaths = {"user", "contactUser"})
    List<TrustedContactEntity> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"user", "contactUser"})
    List<TrustedContactEntity> findByContactUserId(Long contactUserId);

    List<TrustedContactEntity> findByUserIdAndStatus(
            Long userId,
            TrustedContactStatus status
    );

    List<TrustedContactEntity> findByContactUserIdAndStatus(
            Long contactUserId,
            TrustedContactStatus status
    );

    boolean existsByUserIdAndContactUserId(
            Long userId,
            Long contactUserId
    );
}