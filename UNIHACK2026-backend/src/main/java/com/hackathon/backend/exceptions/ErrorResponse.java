
package com.hackathon.backend.exceptions;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

import java.time.OffsetDateTime;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Builder
public record ErrorResponse(
        int status,
        String error,
        String message,
        OffsetDateTime timestamp,
        Map<String, String> validationErrors
) {}
