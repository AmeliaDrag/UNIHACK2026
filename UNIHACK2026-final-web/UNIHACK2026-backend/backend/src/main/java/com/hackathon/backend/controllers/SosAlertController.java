package com.hackathon.backend.controllers;

import com.hackathon.backend.model.dtos.sosAlerts.*;
import com.hackathon.backend.services.SosAlertService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/sos")
@RequiredArgsConstructor
public class SosAlertController {

    private final SosAlertService sosAlertService;

    @PostMapping
    public ResponseEntity<SosAlertReadDTO> create(@Valid @RequestBody SosAlertCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sosAlertService.create(dto));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<SosAlertReadDTO>> getMine() {
        return ResponseEntity.ok(sosAlertService.getMine());
    }

    @GetMapping("/received")
    public ResponseEntity<List<SosAlertReadDTO>> getReceived() {
        return ResponseEntity.ok(sosAlertService.getReceived());
    }

    @PatchMapping("/{id}/resolve")
    public ResponseEntity<SosAlertReadDTO> resolve(@PathVariable @Positive Long id) {
        return ResponseEntity.ok(sosAlertService.resolve(id));
    }
}