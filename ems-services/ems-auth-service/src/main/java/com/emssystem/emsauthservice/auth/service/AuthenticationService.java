package com.emssystem.emsauthservice.auth.service;

import com.emssystem.emsauthservice.auth.dto.request.LoginRequest;
import com.emssystem.emsauthservice.auth.dto.request.RefreshTokenRequest;
import com.emssystem.emsauthservice.auth.dto.response.LoginResponse;
import com.emssystem.emsauthservice.security.entity.RefreshToken;
import com.emssystem.emsauthservice.security.service.JwtService;
import com.emssystem.emsauthservice.security.service.RefreshTokenService;
import com.emssystem.emsauthservice.user.entity.UserAccount;
import com.emssystem.emsauthservice.user.enums.AccountStatus;
import com.emssystem.emsauthservice.user.repository.UserAccountRepository;
import lombok.extern.java.Log;
import org.jspecify.annotations.Nullable;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;

@Service
public class AuthenticationService {
    private static final String INVALID_CREDENTIALS = "Invalid email or password";
    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthenticationService(
            UserAccountRepository userAccountRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService
    ){
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    public LoginResponse login(LoginRequest request){
        String normalizedEmail = normalizeEmail(request.email());

        UserAccount account =
                userAccountRepository.findByEmailIgnoreCase(normalizedEmail);

        // Use one generic message for both cases to avoid exposing registered emails.
        if (account == null
                || !passwordEncoder.matches(request.password(), account.getPasswordHash())) {
            throw new BadCredentialsException(INVALID_CREDENTIALS);
        }

        requireActive(account);
        Instant now = Instant.now();
        JwtService.IssuedAccessToken accessToken = jwtService.issuedAccessToken(account, now);
        String refreshToken = refreshTokenService.issue(account,now);
        return new LoginResponse(
                accessToken.value(),
                refreshToken,
                accessToken.expiresAt()
        );
    }
    /**
     * Rotates a valid refresh token and returns a new access/refresh pair.
     */
    public LoginResponse refresh(RefreshTokenRequest request) {
        Instant now = Instant.now();
        RefreshTokenService.RotatedRefreshToken rotation =
                refreshTokenService.rotate(request.refreshToken(), now);

        UserAccount account = rotation.account();
        requireActive(account);

        JwtService.IssuedAccessToken accessToken =
                jwtService.issuedAccessToken(account, now);

        return new LoginResponse(
                accessToken.value(),
                rotation.token(),
                accessToken.expiresAt()
        );
    }

    private String normalizeEmail(String email){
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private void requireActive(UserAccount account) {
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new DisabledException("Account is not active");
        }
    }
}
