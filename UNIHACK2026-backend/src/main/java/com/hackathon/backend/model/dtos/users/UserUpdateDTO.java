package com.hackathon.backend.model.dtos.users;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;
import lombok.Builder;

@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record UserUpdateDTO(


        @Size(min =1, max = 100)
        String name,

        @Pattern(
                regexp = "^\\+?[0-9]{9,15}$",
                message = "Invalid phone number"
        )
        String phoneNumber

) {}
