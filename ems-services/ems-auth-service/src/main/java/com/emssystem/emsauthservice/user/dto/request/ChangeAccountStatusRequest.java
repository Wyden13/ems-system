package com.emssystem.emsauthservice.user.dto.request;

import com.emssystem.emsauthservice.user.enums.AccountStatus;
import jakarta.validation.constraints.NotNull;

public record ChangeAccountStatusRequest(
        @NotNull(message = "Status is required")
        AccountStatus status
) {
}