package com.hackathon.backend.model.dtos.trustedContacts;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hackathon.backend.model.TrustedContactStatus;
import lombok.Builder;

@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record TrustedContactReadDTO (
        Long id,
        Long userId,
        String userName,
        String userEmail,
        Long contactUserId,
        String contactUserName,
        String contactUserEmail,
        TrustedContactStatus status,
        String userWingColor,
        String userDotColor,
        String contactUserWingColor,
        String contactUserDotColor
) {}