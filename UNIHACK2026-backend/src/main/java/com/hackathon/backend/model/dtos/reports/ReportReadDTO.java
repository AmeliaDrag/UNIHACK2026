package com.hackathon.backend.model.dtos.reports;

import com.hackathon.backend.model.ReportType;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record ReportReadDTO (
        Long id,
        ReportType type,
        Double latitude,
        Double longitude,
        LocalDateTime createdAt,
        LocalDateTime expiresAt
) {}