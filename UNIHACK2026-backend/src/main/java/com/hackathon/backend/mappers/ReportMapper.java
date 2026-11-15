package com.hackathon.backend.mappers;
import com.hackathon.backend.model.dtos.reports.ReportCreateDTO;
import com.hackathon.backend.model.dtos.reports.ReportReadDTO;
import com.hackathon.backend.model.entities.*;
import org.springframework.stereotype.Component;

@Component
public class ReportMapper {

    public ReportEntity toEntity(ReportCreateDTO dto, UserEntity user) {
        if (dto == null || user == null)
            return null;

        return ReportEntity.builder()
                .user(user)
                .type(dto.type())
                .latitude(dto.latitude())
                .longitude(dto.longitude())
                .build();
    }

    public ReportReadDTO toDTO(ReportEntity report) {
        if (report == null)
            return null;

        return ReportReadDTO.builder()
                .id(report.getId())
                .type(report.getType())
                .latitude(report.getLatitude())
                .longitude(report.getLongitude())
                .createdAt(report.getCreatedAt())
                .expiresAt(report.getExpiresAt())
                .build();
    }
}
