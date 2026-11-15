package com.hackathon.backend.model.dtos.reports;



import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hackathon.backend.model.ReportType;
import jakarta.validation.constraints.*;
import lombok.Builder;

@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record ReportCreateDTO (

        @NotNull(message = "Report type is required")
        ReportType type,

        @NotNull(message = "Latitude is required")
        @DecimalMin(value = "-90.0", message = "Latitude must be >= -90")
        @DecimalMax(value = "90.0", message = "Latitude must be <= 90")
        Double latitude,

        @NotNull(message = "Longitude is required")
        @DecimalMin(value = "-180.0", message = "Longitude must be >= -180")
        @DecimalMax(value = "180.0", message = "Longitude must be <= 180")
        Double longitude

) {}