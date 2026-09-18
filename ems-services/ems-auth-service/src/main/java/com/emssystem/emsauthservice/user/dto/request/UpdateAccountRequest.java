package com.emssystem.emsauthservice.user.dto.request;

import com.emssystem.emsauthservice.user.entity.AccountRole;

import java.time.Instant;
import java.util.UUID;

public record UpdateAccountRequest(
        String email,
        AccountRole role,
        boolean active
){}