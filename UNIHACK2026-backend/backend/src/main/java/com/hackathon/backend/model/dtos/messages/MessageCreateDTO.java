package com.hackathon.backend.model.dtos.messages;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;
import lombok.Builder;
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record MessageCreateDTO (
        @NotNull(message = "Recipient is required")
        Long recipientId,
        @NotBlank(message = "Message text is required")
        @Size(max = 1000, message = "Message text must be at most 1000 characters")
        String text
) {}