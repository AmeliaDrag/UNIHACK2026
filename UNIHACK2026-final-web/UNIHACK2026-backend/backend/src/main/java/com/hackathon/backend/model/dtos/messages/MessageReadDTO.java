package com.hackathon.backend.model.dtos.messages;
import lombok.Builder;
import java.time.LocalDateTime;
@Builder
public record MessageReadDTO (
        Long id,
        Long senderId,
        Long recipientId,
        String text,
        LocalDateTime createdAt
) {}