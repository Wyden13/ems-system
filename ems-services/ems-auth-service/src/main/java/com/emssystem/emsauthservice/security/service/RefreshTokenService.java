package com.emssystem.emsauthservice.security.service;

import com.emssystem.emsauthservice.security.entity.RefreshToken;
import com.emssystem.emsauthservice.security.repository.RefreshTokenRepository;
import com.emssystem.emsauthservice.user.entity.UserAccount;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

@Service
@Transactional
public class RefreshTokenService {

    private static final int TOKEN_BYTES = 64;
    private static final String INVALID_REFRESH_TOKEN = "Invalid refresh token";

    private final RefreshTokenRepository refreshTokenRepository;
    private final Duration refreshTokenTtl;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${security.jwt.refresh-token-ttl:P30D}") Duration refreshTokenTtl
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenTtl = refreshTokenTtl;
    }

    /**
     * Returns the raw token once while persisting only its SHA-256 hash.
     */
    public String issue(UserAccount account, Instant issuedAt) {
        String rawToken = generateToken();
        RefreshToken token = new RefreshToken(
                account,
                hash(rawToken),
                issuedAt,
                issuedAt.plus(refreshTokenTtl)
        );

        refreshTokenRepository.save(token);
        return rawToken;
    }

    /**
     * Atomically revokes the presented token and creates its replacement.
     */
    public RotatedRefreshToken rotate(String rawToken, Instant now) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new BadCredentialsException(INVALID_REFRESH_TOKEN);
        }

        RefreshToken currentToken = refreshTokenRepository
                .findByTokenHashForUpdate(hash(rawToken))
                .orElseThrow(() -> new BadCredentialsException(INVALID_REFRESH_TOKEN));

        if (currentToken.isRevoked() || currentToken.isExpiredAt(now)) {
            throw new BadCredentialsException(INVALID_REFRESH_TOKEN);
        }

        currentToken.revoke(now);
        UserAccount account = currentToken.getAccount();
        String replacementToken = issue(account, now);

        return new RotatedRefreshToken(account, replacementToken);
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    public record RotatedRefreshToken(UserAccount account, String token) {
    }
}
