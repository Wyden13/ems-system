package com.emssystem.emsauthservice.auth.controller;

import com.emssystem.emsauthservice.auth.dto.request.*;
import com.emssystem.emsauthservice.auth.dto.response.LoginResponse;
import com.emssystem.emsauthservice.auth.service.AuthenticationService;
import com.emssystem.emsauthservice.security.service.RefreshTokenService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthenticationService authentication;
    private final RefreshTokenService sessions;
    private final boolean secure;
    private final Duration lifetime;

    public AuthController(AuthenticationService authentication, RefreshTokenService sessions,
            @Value("${app.session.secure-cookie:true}") boolean secure,
            @Value("${security.jwt.refresh-token-ttl:P30D}") Duration lifetime) {
        this.authentication = authentication;
        this.sessions = sessions;
        this.secure = secure;
        this.lifetime = lifetime;
    }

    @GetMapping("/csrf")
    public ResponseEntity<Map<String, String>> csrf(CsrfToken token) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(Map.of("token", token.getToken(), "headerName", token.getHeaderName()));
    }

    @PostMapping("/login")
    public ResponseEntity<BrowserSession> login(@Valid @RequestBody LoginRequest request,
            @CookieValue(name = "ems_refresh", required = false) String previous) {
        var result = authentication.login(request);
        if (previous != null)
            sessions.revoke(previous);
        return response(result);
    }

    @PostMapping("/refresh")
    public ResponseEntity<BrowserSession> refresh(@CookieValue(name = "ems_refresh", required = false) String token) {
        return response(authentication.refresh(new RefreshTokenRequest(token)));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = "ems_refresh", required = false) String token) {
        if (token != null)
            sessions.revoke(token);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO))
                .cacheControl(CacheControl.noStore()).build();
    }

    private ResponseEntity<BrowserSession> response(LoginResponse result) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header(HttpHeaders.PRAGMA, "no-cache")
                .header(HttpHeaders.SET_COOKIE, cookie(result.refreshToken(), lifetime))
                .body(new BrowserSession(result.accessToken(), "Bearer", result.expiresAt()));
    }

    private String cookie(String token, Duration age) {
        return ResponseCookie.from("ems_refresh", token).httpOnly(true).secure(secure).sameSite("Lax")
                .path("/api/v1/auth").maxAge(age).build().toString();
    }

    public record BrowserSession(String accessToken, String tokenType, Instant expiresAt) {
    }
}
