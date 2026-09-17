package com.emssystem.emsauthservice.user.entity;

import jakarta.persistence.*;
import lombok.Getter;
import org.springframework.data.annotation.LastModifiedDate;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Getter
@Entity
public class UserAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "email",nullable = false,unique=true,length = 320)
    private String email;

    @Column(name = "password_hash",nullable = false)
    private String passwordHash;

    @Column(name = "active",nullable = false)
    private boolean active = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length=30)
    private AccountRole role;

    @Column(name="created_at",nullable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "last_login_at",nullable = false)
    private Instant lastLoginAt;

    protected UserAccount(){}

    public UserAccount(String email, String passwordHash, AccountRole role){
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

    public boolean isActive() {
        return active;
    }

    public AccountRole getRole() {
        return role;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void changePassword(String passwordHard){
        this.passwordHash = passwordHash;
    }

    public void changeRole(AccountRole role){
        this.role = role;
    }
    public void deactivate(){
        this.active = false;
    }
    public void activate(){
        this.active = true;
    }
    @Override
    public int hashCode(){
        return Objects.hash(this.id,this.email,this.passwordHash,this.role);
    }
    @Override
    public String toString(){
        return "User{" + "id=" + this.id + ", email='" + this.email + '\'' + ", role='" + this.role + '\'' + '}';    }
}
