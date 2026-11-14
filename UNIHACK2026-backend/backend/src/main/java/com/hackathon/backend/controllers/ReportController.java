package com.hackathon.backend.controllers;

import com.hackathon.backend.model.dtos.reports.*;
import com.hackathon.backend.services.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping
    public ResponseEntity<ReportReadDTO> create(@Valid @RequestBody ReportCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reportService.create(dto));
    }

    @GetMapping
    public ResponseEntity<List<ReportReadDTO>> getAllActive() {
        return ResponseEntity.ok(reportService.getAllActive());
    }
}