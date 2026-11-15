package com.hackathon.backend.model.dtos.trustedContacts;

import jakarta.validation.constraints.*;
import lombok.Builder;

@Builder
public record TrustedContactsCreateDTO (

        @NotBlank(message = "Contact email is required")
        @Email(message = "Invalid email format")
        String contactEmail
) {}