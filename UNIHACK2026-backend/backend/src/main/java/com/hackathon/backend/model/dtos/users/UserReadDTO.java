package com.hackathon.backend.model.dtos.users;

import lombok.Builder;

@Builder
public record UserReadDTO(
        String name,
        String email,
        String phoneNumber
) {}
