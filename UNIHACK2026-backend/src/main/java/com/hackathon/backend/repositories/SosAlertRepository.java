package com.hackathon.backend.repositories;

import com.hackathon.backend.model.SosAlertStatus;
import com.hackathon.backend.model.entities.SosAlertEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SosAlertRepository extends JpaRepository<SosAlertEntity, Long> {

    List<SosAlertEntity> findBySenderId(Long senderId);

    List<SosAlertEntity> findBySenderIdAndStatus(
            Long senderId,
            SosAlertStatus status
    );

    @Query("""
            SELECT s
            FROM SosAlertEntity s
            JOIN FETCH s.sender
            WHERE s.status = :status
            AND EXISTS (
                SELECT tc.id
                FROM TrustedContactEntity tc
                WHERE tc.user = s.sender
                AND tc.contactUser.id = :contactUserId
                AND tc.status = com.hackathon.backend.model.TrustedContactStatus.ACCEPTED
            )
            ORDER BY s.createdAt DESC
            """)
    List<SosAlertEntity> findReceivedAlerts(
            @Param("contactUserId") Long contactUserId,
            @Param("status") SosAlertStatus status
    );
}