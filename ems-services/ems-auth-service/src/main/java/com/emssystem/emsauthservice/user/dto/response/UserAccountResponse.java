package com.emssystem.emsauthservice.user.dto.response;

import com.emssystem.emsauthservice.user.enums.AccountStatus;
import com.emssystem.emsauthservice.user.enums.RoleType;
import com.emssystem.emsauthservice.user.entity.UserAccount;

import java.time.Instant;
import java.util.UUID;

public record UserAccountResponse(
        UUID id,
        String email,
        RoleType role,
        AccountStatus status,
        Instant createdAt,
        Instant updatedAt,
        Instant lastLoginAt
) {
    public static UserAccountResponse from(UserAccount account){
        return new UserAccountResponse(
                account.getId(),
                account.getEmail(),
                account.getRole(),
                account.getStatus(),
                account.getCreatedAt(),
                account.getUpdatedAt(),
                account.getLastLoginAt()
        );
    }
}