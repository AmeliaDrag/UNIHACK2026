package com.hackathon.backend.repositories;

import com.hackathon.backend.model.TrustedContactStatus;
import com.hackathon.backend.model.entities.TrustedContactEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    // True if an ACCEPTED contact exists between the two users in either direction.
    @Query("""
            select count(t) > 0 from TrustedContactEntity t
            where t.status = com.hackathon.backend.model.TrustedContactStatus.ACCEPTED
              and ((t.user.id = :a and t.contactUser.id = :b)
                or (t.user.id = :b and t.contactUser.id = :a))
            """)
    boolean existsAcceptedBetween(@Param("a") Long a, @Param("b") Long b);
}
