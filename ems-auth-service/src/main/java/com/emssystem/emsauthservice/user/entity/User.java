package com.emssystem.ems.user.entity;

import jakarta.persistence.*;

import java.time.LocalTime;

@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long Id;

    @Column(name = "email",nullable = false)
    private String email;

    @Column(name = "password_hash",nullable = false)
    private String password_hard;

    @Column(name = "enabled",nullable = false)
    private boolean enabled = true;

    @Column(name = "last_login_at",nullable = false)
    private LocalTime lastLoginAt;

    protected User(){}
    public User(String email, String password_hash){
        this.email = email;
        this.password_hard = password_hash;
    }

    public Long getId() {
        return Id;
    }

    public String getEmail() {
        return email;
    }

    public String getPassword_hard() {
        return password_hard;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public LocalTime getLastLoginAt() {
        return lastLoginAt;
    }
}
