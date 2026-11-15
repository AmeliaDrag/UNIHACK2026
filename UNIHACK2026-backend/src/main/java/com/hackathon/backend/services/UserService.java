package com.hackathon.backend.services;

import com.hackathon.backend.mappers.UserMapper;
import com.hackathon.backend.model.dtos.users.*;
import com.hackathon.backend.model.entities.UserEntity;
import com.hackathon.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final CurrentUserService currentUserService;

    @Transactional
    public UserReadDTO create(UserCreateDTO dto) {
        String email = dto.email().trim().toLowerCase();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email already registered"
            );
        }

        UserEntity user = userMapper.toEntity(dto);
        UserEntity savedUser = userRepository.save(user);

        return userMapper.toDTO(savedUser);
    }

    @Transactional(readOnly = true)
    public UserReadDTO getMe() {
        UserEntity user = currentUserService.getCurrentUser();
        return userMapper.toDTO(user);
    }

    @Transactional
    public UserReadDTO updateMe(UserUpdateDTO dto) {
        UserEntity user = currentUserService.getCurrentUser();

        if (dto.name() != null && dto.name().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Name cannot be blank"
            );
        }

        userMapper.updateEntity(dto, user);

        UserEntity saved = userRepository.save(user);

        return userMapper.toDTO(saved);

    }
}