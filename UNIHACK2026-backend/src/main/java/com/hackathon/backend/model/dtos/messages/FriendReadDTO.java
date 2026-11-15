package com.hackathon.backend.model.dtos.messages;
import lombok.Builder;
@Builder
public record FriendReadDTO (
        Long id,
        String name,
        String wingColor,
        String dotColor
) {}