package com.hackathon.backend.mappers;

import com.hackathon.backend.model.dtos.trustedContacts.TrustedContactReadDTO;

import com.hackathon.backend.model.entities.*;
import org.springframework.stereotype.Component;

@Component
public class TrustedContactMapper {

    public TrustedContactEntity toEntity(UserEntity user, UserEntity contactUser) {
        if (user == null || contactUser == null)
            return null;

        return TrustedContactEntity.builder()
                .user(user)
                .contactUser(contactUser)
                .build();   // status = PENDING vine din @Builder.Default
    }

    public TrustedContactReadDTO toDTO(TrustedContactEntity contact) {
        if (contact == null)
            return null;

        return TrustedContactReadDTO.builder()
                .id(contact.getId())
                .userId(contact.getUser().getId())
                .userName(contact.getUser().getName())
                .userEmail(contact.getUser().getEmail())
                .contactUserId(contact.getContactUser().getId())
                .contactUserName(contact.getContactUser().getName())
                .contactUserEmail(contact.getContactUser().getEmail())
                .status(contact.getStatus())
                .userWingColor(contact.getUser().getWingColor())
                .userDotColor(contact.getUser().getDotColor())
                .contactUserWingColor(contact.getContactUser().getWingColor())
                .contactUserDotColor(contact.getContactUser().getDotColor())
                .build();
    }
}