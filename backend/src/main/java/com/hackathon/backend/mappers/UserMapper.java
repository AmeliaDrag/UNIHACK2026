package com.hackathon.backend.mappers;


import com.hackathon.backend.model.dtos.*;
import com.hackathon.backend.model.dtos.users.UserCreateDTO;
import com.hackathon.backend.model.dtos.users.UserReadDTO;
import com.hackathon.backend.model.dtos.users.UserUpdateDTO;
import com.hackathon.backend.model.entities.UserEntity;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserEntity toEntity(UserCreateDTO dto) {
        if (dto == null)
            return null;

        return UserEntity.builder()
                .name(dto.name())
                .email(dto.email())
                .phoneNumber(dto.phoneNumber())
                .build();
    }

    public UserReadDTO toDTO(UserEntity user) {
        if (user == null)
            return null;

        return UserReadDTO.builder()
                .name(user.getName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .build();
    }

    public void updateEntity(UserUpdateDTO dto, UserEntity user) {
        if (dto == null || user == null)
            return;

        if (dto.name() != null && !dto.name().isBlank())
            user.setName(dto.name());

        if (dto.phoneNumber() != null)
            user.setPhoneNumber(dto.phoneNumber());
    }
}