package com.hackathon.backend.controllers;

import com.hackathon.backend.model.dtos.places.PlaceDto;
import com.hackathon.backend.services.PlaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/v1/places")
@RequiredArgsConstructor
public class PlaceController {
    private final PlaceService places;

    @GetMapping("/open-24-7")
    public List<PlaceDto> getOpen247() {
        return places.getPlaces();
    }
}
