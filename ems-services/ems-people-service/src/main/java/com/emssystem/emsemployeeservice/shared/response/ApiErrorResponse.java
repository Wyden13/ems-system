package com.emssystem.emsemployeeservice.shared.response;

import com.emssystem.emsemployeeservice.shared.validation.ValidationError;
import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(Instant timestamp, int status, String code, String message, String path,
        List<ValidationError> errors) {
    public ApiErrorResponse {
        errors = errors == null ? List.of() : List.copyOf(errors);
    }
}
