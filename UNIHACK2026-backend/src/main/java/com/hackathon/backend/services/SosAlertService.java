package com.hackathon.backend.services;

import com.hackathon.backend.mappers.SosAlertMapper;
import com.hackathon.backend.model.SosAlertStatus;
import com.hackathon.backend.model.dtos.sosAlerts.*;
import com.hackathon.backend.model.entities.*;
import com.hackathon.backend.repositories.SosAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SosAlertService {

    private final SosAlertRepository sosAlertRepository;
    private final SosAlertMapper sosAlertMapper;
    private final CurrentUserService currentUserService;

    @Transactional
    public SosAlertReadDTO create(SosAlertCreateDTO dto) {
        validateCoordinates(dto.latitude(), dto.longitude());

        UserEntity sender = currentUserService.getCurrentUser();

        SosAlertEntity alert = sosAlertMapper.toEntity(dto, sender);
        SosAlertEntity savedAlert = sosAlertRepository.save(alert);

        return sosAlertMapper.toDTO(savedAlert);
    }

    @Transactional(readOnly = true)
    public List<SosAlertReadDTO> getMine() {
        UserEntity currentUser = currentUserService.getCurrentUser();

        return sosAlertRepository
                .findBySenderId(currentUser.getId())
                .stream()
                .map(sosAlertMapper::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SosAlertReadDTO> getReceived() {
        UserEntity currentUser = currentUserService.getCurrentUser();

        return sosAlertRepository
                .findReceivedAlerts(
                        currentUser.getId(),
                        SosAlertStatus.ACTIVE
                )
                .stream()
                .map(sosAlertMapper::toDTO)
                .toList();
    }

    @Transactional
    public SosAlertReadDTO resolve(Long id) {
        UserEntity currentUser = currentUserService.getCurrentUser();

        SosAlertEntity alert = sosAlertRepository
                .findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "SOS alert not found"
                ));

        if (!alert.getSender().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You cannot resolve this alert"
            );
        }

        if (alert.getStatus() != SosAlertStatus.ACTIVE) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "SOS alert is not active"
            );
        }

        alert.setStatus(SosAlertStatus.RESOLVED);

        return sosAlertMapper.toDTO(alert);
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