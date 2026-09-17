package com.emssystem.emsauthservice.user.entity;

import jakarta.persistence.*;

@Entity
@Table(name="roles")
public class AccountRole {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String roleLabel;

    protected AccountRole(){}
}
