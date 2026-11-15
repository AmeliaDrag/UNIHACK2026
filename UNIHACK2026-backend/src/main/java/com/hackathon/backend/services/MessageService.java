package com.hackathon.backend.services;
import com.hackathon.backend.mappers.MessageMapper;
import com.hackathon.backend.model.TrustedContactStatus;
import com.hackathon.backend.model.dtos.messages.FriendReadDTO;
import com.hackathon.backend.model.dtos.messages.MessageCreateDTO;
import com.hackathon.backend.model.dtos.messages.MessageReadDTO;
import com.hackathon.backend.model.entities.MessageEntity;
import com.hackathon.backend.model.entities.UserEntity;
import com.hackathon.backend.repositories.MessageRepository;
import com.hackathon.backend.repositories.TrustedContactRepository;
import com.hackathon.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
@Service
@RequiredArgsConstructor
public class MessageService {
    private static final int MAX_PAGE = 100;
    private final MessageRepository messageRepository;
    private final TrustedContactRepository trustedContactRepository;
    private final UserRepository userRepository;
    private final MessageMapper messageMapper;
    private final CurrentUserService currentUserService;
    // Accepted friends of the current user, in either direction. Id and name only.
    @Transactional(readOnly = true)
    public List<FriendReadDTO> getFriends() {
        UserEntity me = currentUserService.getCurrentUser();
        Map<Long, UserEntity> friends = new LinkedHashMap<>();
        trustedContactRepository
                .findByUserIdAndStatus(me.getId(), TrustedContactStatus.ACCEPTED)
                .forEach(t -> friends.putIfAbsent(
                        t.getContactUser().getId(), t.getContactUser()));
        trustedContactRepository
                .findByContactUserIdAndStatus(me.getId(), TrustedContactStatus.ACCEPTED)
                .forEach(t -> friends.putIfAbsent(
                        t.getUser().getId(), t.getUser()));
        return friends.values().stream()
                .map(u -> FriendReadDTO.builder()
                        .id(u.getId())
                        .name(u.getName())
                        .wingColor(u.getWingColor())
                        .dotColor(u.getDotColor())
                        .build())
                .toList();
    }
    @Transactional
    public MessageReadDTO send(MessageCreateDTO dto) {
        UserEntity me = currentUserService.getCurrentUser();
        String text = dto.text().trim();
        if (text.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Message text is required");
        }
        if (me.getId().equals(dto.recipientId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "You cannot message yourself");
        }
        UserEntity recipient = findUser(dto.recipientId());
        requireFriends(me, recipient);
        MessageEntity saved = messageRepository.save(
                messageMapper.toEntity(me, recipient, text));
        return messageMapper.toDTO(saved);
    }
    // Both directions, oldest first, at most MAX_PAGE messages.
    // Without afterId: the latest MAX_PAGE messages. With afterId: only newer ones.
    @Transactional(readOnly = true)
    public List<MessageReadDTO> getConversation(Long friendId, Long afterId) {
        UserEntity me = currentUserService.getCurrentUser();
        if (me.getId().equals(friendId)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "You cannot chat with yourself");
        }
        UserEntity friend = findUser(friendId);
        requireFriends(me, friend);
        List<MessageEntity> rows;
        if (afterId == null) {
            rows = new ArrayList<>(messageRepository.findLatestBetween(
                    me.getId(), friend.getId(), PageRequest.of(0, MAX_PAGE)));
            Collections.reverse(rows);
        } else {
            rows = messageRepository.findBetweenAfter(
                    me.getId(), friend.getId(), afterId, PageRequest.of(0, MAX_PAGE));
        }
        return rows.stream().map(messageMapper::toDTO).toList();
    }
    // Messages sent TO the current user (any friend), oldest first, at most MAX_PAGE.
    // Without afterId: the latest MAX_PAGE. With afterId: only newer ones. Used for the
    // unread indicator, so the frontend needs one request instead of one per friend.
    @Transactional(readOnly = true)
    public List<MessageReadDTO> getReceived(Long afterId) {
        UserEntity me = currentUserService.getCurrentUser();
        List<MessageEntity> rows;
        if (afterId == null) {
            rows = new ArrayList<>(messageRepository.findLatestReceived(
                    me.getId(), PageRequest.of(0, MAX_PAGE)));
            Collections.reverse(rows);
        } else {
            rows = messageRepository.findReceivedAfter(
                    me.getId(), afterId, PageRequest.of(0, MAX_PAGE));
        }
        return rows.stream().map(messageMapper::toDTO).toList();
    }
    private UserEntity findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));
    }
    private void requireFriends(UserEntity a, UserEntity b) {
        if (!trustedContactRepository.existsAcceptedBetween(a.getId(), b.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "You can only chat with accepted friends");
        }
    }
}