package com.hackathon.backend.services;

import com.hackathon.backend.model.entities.UserEntity;
public interface CurrentUserService {
    UserEntity getCurrentUser();
}
