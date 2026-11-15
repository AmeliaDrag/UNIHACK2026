package com.hackathon.backend.services;

import com.hackathon.backend.mappers.TrustedContactMapper;
import com.hackathon.backend.model.TrustedContactStatus;
import com.hackathon.backend.model.dtos.trustedContacts.*;
import com.hackathon.backend.model.entities.*;
import com.hackathon.backend.repositories.TrustedContactRepository;
import com.hackathon.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TrustedContactService {

    private final TrustedContactRepository trustedContactRepository;
    private final UserRepository userRepository;
    private final TrustedContactMapper trustedContactMapper;
    private final CurrentUserService currentUserService;

    @Transactional
    public TrustedContactReadDTO create(TrustedContactsCreateDTO dto) {
        UserEntity currentUser = currentUserService.getCurrentUser();

        String email = dto.contactEmail().trim();

        UserEntity contactUser = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Contact user not found"
                ));

        if (currentUser.getId().equals(contactUser.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "You cannot add yourself"
            );
        }

        if (trustedContactRepository.existsByUserIdAndContactUserId(
                currentUser.getId(),
                contactUser.getId()
        )) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Contact already exists"
            );
        }

        TrustedContactEntity contact = trustedContactMapper.toEntity(
                currentUser,
                contactUser
        );

        TrustedContactEntity savedContact =
                trustedContactRepository.save(contact);

        return trustedContactMapper.toDTO(savedContact);
    }

    @Transactional(readOnly = true)
    public List<TrustedContactReadDTO> getSent() {
        UserEntity currentUser = currentUserService.getCurrentUser();

        return trustedContactRepository
                .findByUserId(currentUser.getId())
                .stream()
                .map(trustedContactMapper::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TrustedContactReadDTO> getReceived() {
        UserEntity currentUser = currentUserService.getCurrentUser();

        return trustedContactRepository
                .findByContactUserId(currentUser.getId())
                .stream()
                .map(trustedContactMapper::toDTO)
                .toList();
    }

    @Transactional
    public TrustedContactReadDTO accept(Long id) {
        UserEntity currentUser = currentUserService.getCurrentUser();

        TrustedContactEntity contact = trustedContactRepository
                .findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Contact request not found"
                ));

        if (!contact.getContactUser().getId()
                .equals(currentUser.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only the recipient can accept this request"
            );
        }

        if (contact.getStatus() != TrustedContactStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Request is not pending"
            );
        }

        contact.setStatus(TrustedContactStatus.ACCEPTED);

        return trustedContactMapper.toDTO(contact);
    }

    @Transactional
    public void delete(Long id) {
        UserEntity currentUser = currentUserService.getCurrentUser();

        TrustedContactEntity contact = trustedContactRepository
                .findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Contact not found"
                ));

        boolean isSender = contact.getUser().getId()
                .equals(currentUser.getId());

        boolean isRecipient = contact.getContactUser().getId()
                .equals(currentUser.getId());

        if (!isSender && !isRecipient) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You cannot delete this contact"
            );
        }

        trustedContactRepository.delete(contact);
    }
}