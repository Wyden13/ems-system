package com.emssystem.emsauthservice.user.dto.request;

import com.emssystem.emsauthservice.user.entity.AccountRole;

import java.time.Instant;
import java.util.UUID;

public Record UpdateAccountRequest(
        UUID id,
        String email,
        AccountRole role,
        boolean active,
        Instant createdAt,
        Instant updatedAT
){}