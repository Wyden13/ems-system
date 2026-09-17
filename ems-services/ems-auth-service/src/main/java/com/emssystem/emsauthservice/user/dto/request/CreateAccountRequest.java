package com.emssystem.emsauthservice.user.dto.request;


import com.emssystem.emsauthservice.user.entity.AccountRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateAccountRequest(
        @NotBlank
        @Email
        String email,

        @NotBlank
        @Size(min=8,max=120)
        String password,

        @NotNull
        AccountRole role
) {
}