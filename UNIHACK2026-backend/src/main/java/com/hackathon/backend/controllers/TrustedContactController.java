package com.hackathon.backend.controllers;

import com.hackathon.backend.model.dtos.trustedContacts.*;
import com.hackathon.backend.services.TrustedContactService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/trusted-contacts")
@RequiredArgsConstructor
public class TrustedContactController {

    private final TrustedContactService trustedContactService;

    @PostMapping
    public ResponseEntity<TrustedContactReadDTO> create(
            @Valid @RequestBody TrustedContactsCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(trustedContactService.create(dto));
    }

    @GetMapping("/sent")
    public ResponseEntity<List<TrustedContactReadDTO>> getSent() {
        return ResponseEntity.ok(trustedContactService.getSent());
    }

    @GetMapping("/received")
    public ResponseEntity<List<TrustedContactReadDTO>> getReceived() {
        return ResponseEntity.ok(trustedContactService.getReceived());
    }

    @PatchMapping("/{id}/accept")
    public ResponseEntity<TrustedContactReadDTO> accept(@PathVariable @Positive Long id) {
        return ResponseEntity.ok(trustedContactService.accept(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable @Positive Long id) {
        trustedContactService.delete(id);
        return ResponseEntity.noContent().build();
    }
}