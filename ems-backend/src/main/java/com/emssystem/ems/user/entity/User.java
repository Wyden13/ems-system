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
}
