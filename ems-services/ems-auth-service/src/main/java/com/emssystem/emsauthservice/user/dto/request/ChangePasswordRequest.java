package com.emssystem.emsauthservice.user.dto.request;

import com.emssystem.emsauthservice.user.enums.RoleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
//import org.hibernate.annotations.processing.Pattern;

public record ChangePasswordRequest (
        @NotBlank(message = "Current password is required")
        String currentPassword,
        @NotBlank(message = "New password is required")
        @Size(min = 12, max = 128, message = "Password must be 12–128 characters")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)\\S{12,128}$",
                message = "Password must contain uppercase, lowercase, and numeric characters"
        )
        String newPassword,

        @NotNull(message = "Role is required")
        RoleType role
){
    @Override
    public String toString(){
        return "ChangePasswordRequest[currentPassword=***, newPassword=***]";
    }
}
