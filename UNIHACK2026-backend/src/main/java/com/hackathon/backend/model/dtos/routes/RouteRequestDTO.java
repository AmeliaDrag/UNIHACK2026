package com.hackathon.backend.model.dtos.routes;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record RouteRequestDTO(@NotNull @Valid Point origin, @NotNull @Valid Point destination) {
    public record Point(@NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
                        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude) {}
}
