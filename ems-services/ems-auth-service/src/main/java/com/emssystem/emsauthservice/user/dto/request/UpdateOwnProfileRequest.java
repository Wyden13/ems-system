package com.emssystem.emsauthservice.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UpdateOwnProfileRequest(
        @NotBlank(message = "email is required")
        @Email(message = "email must be valid")
        String email
) {
}
