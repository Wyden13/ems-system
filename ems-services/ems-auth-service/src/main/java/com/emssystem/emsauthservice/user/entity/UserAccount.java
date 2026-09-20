package com.emssystem.emsauthservice.user.entity;

import com.emssystem.emsauthservice.user.enums.AccountStatus;
import com.emssystem.emsauthservice.user.enums.RoleType;
import jakarta.persistence.*;
import lombok.Getter;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.data.annotation.CreatedDate;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Getter
@Entity
@EntityListeners(AuditingEntityListener.class)

public class UserAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "email",nullable = false,unique=true,length = 320)
    private String email;

    @Column(name = "password_hash",nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "active",nullable = false,length=20)
    private AccountStatus status = AccountStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length=30)
    private RoleType role;

    @Column(name="created_at",nullable = false,updatable = false)
    private Instant createdAt;

    @Column(name="updated_at",nullable = false)
    private Instant updatedAt;

    @LastModifiedDate
    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    protected UserAccount(){}

    public UserAccount(String email, String passwordHash, RoleType role){
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public RoleType getRole() {
        return role;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void changePassword(String passwordHash){
        this.passwordHash = passwordHash;
    }

    public void changeRole(RoleType role){
        this.role = role;
    }
    public void changeStatus(AccountStatus status){
        this.status = status;
    }
    public void changeEmail(String newEmail){
        this.email = newEmail;
    }
}
