package com.hackathon.backend.model.dtos.routes;

import com.fasterxml.jackson.annotation.JsonInclude;
import tools.jackson.databind.JsonNode;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record RouteResponseDTO(JsonNode geometry, double distanceMeters, double durationSeconds,
                               boolean avoidanceApplied, boolean avoidanceLimited, String warning,
                               int avoidancePolygonCount) {}
