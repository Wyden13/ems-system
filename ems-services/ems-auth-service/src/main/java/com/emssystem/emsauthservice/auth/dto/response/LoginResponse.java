package com.emssystem.emsauthservice.auth.dto.response;

import java.time.Instant;

public record LoginResponse (
    String accessToken,
    String refreshToken,
    String tokenType,
    Instant expiresAt
){
    public LoginResponse(String accessToken,String refreshToken, Instant expiresAt){
        this(accessToken,refreshToken,"Bearer", expiresAt);
    }
}
