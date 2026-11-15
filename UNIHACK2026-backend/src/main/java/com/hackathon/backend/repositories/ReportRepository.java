package com.hackathon.backend.repositories;

import com.hackathon.backend.model.entities.ReportEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ReportRepository extends JpaRepository<ReportEntity, Long> {

    @org.springframework.data.jpa.repository.Query("""
            select r from ReportEntity r where r.expiresAt > :now
            and r.latitude between :minLat and :maxLat
            and r.longitude between :minLon and :maxLon
            """)
    List<ReportEntity> findActiveInBounds(LocalDateTime now, double minLat, double maxLat,
                                         double minLon, double maxLon);

    List<ReportEntity> findByExpiresAtAfter(LocalDateTime now);

    List<ReportEntity> findByUserId(Long userId);

    long deleteByExpiresAtBefore(LocalDateTime now);
}
