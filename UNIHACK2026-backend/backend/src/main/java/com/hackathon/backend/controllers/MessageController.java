package com.hackathon.backend.controllers;
import com.hackathon.backend.model.dtos.messages.MessageCreateDTO;
import com.hackathon.backend.model.dtos.messages.MessageReadDTO;
import com.hackathon.backend.services.MessageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/api/v1/messages")
@RequiredArgsConstructor
@Validated
public class MessageController {
    private final MessageService messageService;
    @PostMapping
    public ResponseEntity<MessageReadDTO> send(@Valid @RequestBody MessageCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(messageService.send(dto));
    }
    @GetMapping("/received")
    public ResponseEntity<List<MessageReadDTO>> getReceived(
            @RequestParam(required = false) @PositiveOrZero Long afterId) {
        return ResponseEntity.ok(messageService.getReceived(afterId));
    }
    @GetMapping("/with/{friendId}")
    public ResponseEntity<List<MessageReadDTO>> getConversation(
            @PathVariable @Positive Long friendId,
            @RequestParam(required = false) @PositiveOrZero Long afterId) {
        return ResponseEntity.ok(messageService.getConversation(friendId, afterId));
    }
}