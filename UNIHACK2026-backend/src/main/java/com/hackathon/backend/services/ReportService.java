package com.hackathon.backend.services;

import com.hackathon.backend.mappers.ReportMapper;
import com.hackathon.backend.model.dtos.reports.*;
import com.hackathon.backend.model.entities.ReportEntity;
import com.hackathon.backend.model.entities.UserEntity;
import com.hackathon.backend.repositories.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final ReportMapper reportMapper;
    private final CurrentUserService currentUserService;

    @Transactional
    public ReportReadDTO create(ReportCreateDTO dto) {
        validateCoordinates(dto.latitude(), dto.longitude());

        UserEntity user = currentUserService.getCurrentUser();

        ReportEntity report = reportMapper.toEntity(dto, user);
        ReportEntity savedReport = reportRepository.save(report);

        return reportMapper.toDTO(savedReport);
    }

    @Transactional(readOnly = true)
    public List<ReportReadDTO> getAllActive() {
        return reportRepository
                .findByExpiresAtAfter(LocalDateTime.now())
                .stream()
                .map(reportMapper::toDTO)
                .toList();
    }

    private void validateCoordinates(Double latitude, Double longitude) {
        if (latitude == null || longitude == null
                || !Double.isFinite(latitude)
                || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90
                || longitude < -180 || longitude > 180) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid coordinates"
            );
        }
    }
}