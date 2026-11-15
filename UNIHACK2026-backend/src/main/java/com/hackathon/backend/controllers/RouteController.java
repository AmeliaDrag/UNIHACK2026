package com.hackathon.backend.controllers;

import com.hackathon.backend.model.dtos.routes.*;
import com.hackathon.backend.services.RouteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/routes")
@RequiredArgsConstructor
public class RouteController {
    private final RouteService routes;
    @PostMapping
    public RouteResponseDTO route(@Valid @RequestBody RouteRequestDTO request) {
        return routes.route(request);
    }
}
