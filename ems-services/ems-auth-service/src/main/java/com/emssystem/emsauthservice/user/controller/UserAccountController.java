package com.emssystem.emsauthservice.user.controller;

import com.emssystem.emsauthservice.user.dto.request.*;
import com.emssystem.emsauthservice.user.dto.response.UserAccountResponse;
import com.emssystem.emsauthservice.user.entity.UserAccount;
import com.emssystem.emsauthservice.user.service.UserAccountService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class UserAccountController {
    private final UserAccountService userAccountService;

    public UserAccountController(UserAccountService accountService){
        this.userAccountService = accountService;
    }


    @GetMapping("/accounts/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserAccountResponse> getOwnAccount(
            Authentication authentication
    ) {
        UUID accountId = currentAccountId(authentication);
        return ResponseEntity.ok(userAccountService.findById(accountId));
    }

    @PatchMapping("/accounts/me/password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> changeOwnPassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        UUID accountId = currentAccountId(authentication);
        userAccountService.changePassword(
                accountId,
                request.currentPassword(),
                request.newPassword()
        );
        return ResponseEntity.noContent().build();
    }
    @PatchMapping("/accounts/me/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserAccountResponse> updateOwnProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateOwnProfileRequest request
    ) {
        UUID accountId = currentAccountId(authentication);
        return ResponseEntity.ok(
                userAccountService.updateOwnProfile(accountId, request.email())
        );
    }

    private UUID currentAccountId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException(
                    "Authentication is required"
            );
        }

        try {
            return UUID.fromString(authentication.getName());
        } catch (IllegalArgumentException exception) {
            throw new AuthenticationCredentialsNotFoundException(
                    "The authenticated principal does not contain a valid account ID"
            );
        }
    }

}
