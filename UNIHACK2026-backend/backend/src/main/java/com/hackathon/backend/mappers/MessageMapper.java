package com.hackathon.backend.mappers;
import com.hackathon.backend.model.dtos.messages.MessageReadDTO;
import com.hackathon.backend.model.entities.MessageEntity;
import com.hackathon.backend.model.entities.UserEntity;
import org.springframework.stereotype.Component;
@Component
public class MessageMapper {
    public MessageEntity toEntity(UserEntity sender, UserEntity recipient, String text) {
        if (sender == null || recipient == null || text == null)
            return null;
        return MessageEntity.builder()
                .sender(sender)
                .recipient(recipient)
                .text(text)
                .build();
    }
    public MessageReadDTO toDTO(MessageEntity message) {
        if (message == null)
            return null;
        return MessageReadDTO.builder()
                .id(message.getId())
                .senderId(message.getSender().getId())
                .recipientId(message.getRecipient().getId())
                .text(message.getText())
                .createdAt(message.getCreatedAt())
                .build();
    }
}