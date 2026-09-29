package com.emssystem.emsauthservice.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest (
        @NotBlank(message = "Current password is required")
        String currentPassword,
        @NotBlank(message = "New password is required")
        @Size(min = 12, max = 72, message = "Password must be 12–72 characters")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)\\S{12,72}$",
                message = "Password must contain uppercase, lowercase, and numeric characters"
        )
        String newPassword
){
    @Override
    public String toString(){
        return "ChangePasswordRequest[currentPassword=***, newPassword=***]";
    }
}
