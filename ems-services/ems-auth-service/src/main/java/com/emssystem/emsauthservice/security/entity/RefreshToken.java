package com.emssystem.emsauthservice.security.entity;

import com.emssystem.emsauthservice.user.entity.UserAccount;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(
        name="refresh_tokens",
        indexes = {
                @Index(name = "idx_refresh_token_hash", columnList = "token_hash", unique = true),
                @Index(name="idx_refresh_token_account",columnList = "user_account_id")
        }
)
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_account_id",nullable = false)
    private UserAccount account;

    @Column(name="token_hash",nullable = false,unique = true,length = 64)
    private String tokenHash;

    @Column(name="created_at",nullable = false,updatable = false)
    private Instant createdAt;

    @Column(name="expires_at",nullable = false)
    private Instant expiresAt;

    @Column(name="revoked_at")
    private Instant revokedAt;

    protected RefreshToken() {
    }
    public RefreshToken(
            UserAccount account,
            String tokenHash,
            Instant createdAt,
            Instant expiresAt
    ) {
        this.account = account;
        this.tokenHash = tokenHash;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public UserAccount getAccount() {
        return account;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public boolean isExpiredAt(Instant time) {
        return !expiresAt.isAfter(time);
    }

    public void revoke(Instant time) {
        this.revokedAt = time;
    }

}
