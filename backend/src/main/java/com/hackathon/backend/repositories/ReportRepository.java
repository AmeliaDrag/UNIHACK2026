package com.hackathon.backend.repositories;

import com.hackathon.backend.model.entities.ReportEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ReportRepository extends JpaRepository<ReportEntity, Long> {

    List<ReportEntity> findByExpiresAtAfter(LocalDateTime now);

    List<ReportEntity> findByUserId(Long userId);

    long deleteByExpiresAtBefore(LocalDateTime now);
}
