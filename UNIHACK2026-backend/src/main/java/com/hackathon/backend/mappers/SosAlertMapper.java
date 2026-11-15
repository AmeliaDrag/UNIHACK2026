package com.hackathon.backend.mappers;

import com.hackathon.backend.model.dtos.sosAlerts.SosAlertCreateDTO;
import com.hackathon.backend.model.dtos.sosAlerts.SosAlertReadDTO;
import com.hackathon.backend.model.entities.*;
import org.springframework.stereotype.Component;

@Component
public class SosAlertMapper {

    public SosAlertEntity toEntity(SosAlertCreateDTO dto, UserEntity sender) {
        if (dto == null || sender == null)
            return null;

        return SosAlertEntity.builder()
                .sender(sender)
                .latitude(dto.latitude())
                .longitude(dto.longitude())
                .build();   // status = ACTIVE vine din @Builder.Default
    }

    public SosAlertReadDTO toDTO(SosAlertEntity alert) {
        if (alert == null)
            return null;

        return SosAlertReadDTO.builder()
                .id(alert.getId())
                .senderId(alert.getSender().getId())
                .senderName(alert.getSender().getName())
                .latitude(alert.getLatitude())
                .longitude(alert.getLongitude())
                .createdAt(alert.getCreatedAt())
                .status(alert.getStatus())
                .build();
    }
}