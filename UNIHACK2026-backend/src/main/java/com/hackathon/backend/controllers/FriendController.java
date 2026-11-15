package com.hackathon.backend.controllers;
import com.hackathon.backend.model.dtos.messages.FriendReadDTO;
import com.hackathon.backend.services.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/api/v1/friends")
@RequiredArgsConstructor
public class FriendController {
    private final MessageService messageService;
    @GetMapping
    public ResponseEntity<List<FriendReadDTO>> getFriends() {
        return ResponseEntity.ok(messageService.getFriends());
    }
}