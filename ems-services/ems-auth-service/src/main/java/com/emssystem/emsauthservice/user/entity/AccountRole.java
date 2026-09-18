package com.emssystem.emsauthservice.user.entity;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name="roles")
public class AccountRole {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String roleLabel;

    protected AccountRole(){}
}
