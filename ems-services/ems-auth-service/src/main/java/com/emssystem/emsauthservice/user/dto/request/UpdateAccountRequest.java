package com.emssystem.emsauthservice.user.dto.request;

import com.emssystem.emsauthservice.user.entity.RoleType;

import javax.management.relation.Role;

public record UpdateAccountRequest(
        String email,
        RoleType role,
        boolean active
){}