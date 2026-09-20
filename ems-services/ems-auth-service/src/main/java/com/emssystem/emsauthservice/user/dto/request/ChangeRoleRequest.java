package com.emssystem.emsauthservice.user.dto.request;

import com.emssystem.emsauthservice.user.enums.RoleType;
import jakarta.validation.constraints.NotNull;

public record ChangeRoleRequest(
        @NotNull(message = "role is required")
        RoleType role
){}