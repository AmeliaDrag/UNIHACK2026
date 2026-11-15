package com.hackathon.backend.model.dtos.sosAlerts;



import com.hackathon.backend.model.SosAlertStatus;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record SosAlertReadDTO(
        Long id,
        Long senderId,
        String senderName,
        Double latitude,
        Double longitude,
        LocalDateTime createdAt,
        SosAlertStatus status
) {}