package com.emssystem.emsauthservice.user.dto.request;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateAccountRequest(
        @NotBlank
        @Email
        String email,

        @NotBlank
        @Size(min=8,max=120)
        String password,

        com.emssystem.emsauthservice.user.entity.RoleType role
) {
}