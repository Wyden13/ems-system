package com.emssystem.emsauthservice.user.dto.response;

import com.emssystem.emsauthservice.user.entity.RoleType;
import com.emssystem.emsauthservice.user.entity.UserAccount;

import java.time.Instant;
import java.util.UUID;

public record UserAccountResponse(
        UUID id,
        String email,
        RoleType role,
        boolean active,
        Instant createdAt,
        Instant updatedAT
) {
    public static UserAccountResponse from(UserAccount account){
        return new UserAccountResponse(
                account.getId(),
                account.getEmail(),
                account.getRole(),
                account.isActive(),
                account.getCreatedAt(),
                account.getLastLoginAt()
        );
    }
}