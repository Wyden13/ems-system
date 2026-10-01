package com.emssystem.emspayrollservice.shared.security;

import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public record Caller(UUID accountId, String role) {
    public static Caller current() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return new Caller(UUID.fromString(jwt.getSubject()), jwt.getClaimAsString("role"));
    }

    public boolean manages() {
        return "ADMIN".equals(role) || "MANAGER".equals(role);
    }

    public boolean supervises() {
        return "SUPERVISOR".equals(role);
    }

    public void requireManager() {
        if (!manages())
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Manager or Admin access required");
    }
}
