package com.hackathon.backend.controllers;

import com.hackathon.backend.model.dtos.users.*;
import com.hackathon.backend.services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    public ResponseEntity<UserReadDTO> create(@Valid @RequestBody UserCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(dto));
    }

    @GetMapping("/me")
    public ResponseEntity<UserReadDTO> getMe() {
        return ResponseEntity.ok(userService.getMe());
    }

    @PutMapping("/me")
    public ResponseEntity<UserReadDTO> updateMe(@Valid @RequestBody UserUpdateDTO dto) {
        return ResponseEntity.ok(userService.updateMe(dto));
    }
}