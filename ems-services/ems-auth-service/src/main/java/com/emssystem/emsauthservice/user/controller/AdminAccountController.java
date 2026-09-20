package com.emssystem.emsauthservice.user.controller;
import com.emssystem.emsauthservice.user.dto.request.ChangeAccountStatusRequest;
import com.emssystem.emsauthservice.user.dto.request.ChangeRoleRequest;
import com.emssystem.emsauthservice.user.dto.request.CreateAccountRequest;
import com.emssystem.emsauthservice.user.dto.response.UserAccountResponse;
import com.emssystem.emsauthservice.user.service.UserAccountService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminAccountController {

    private final UserAccountService userAccountService;

    public AdminAccountController(UserAccountService userAccountService){
        this.userAccountService = userAccountService;
    }
    @PostMapping("/accounts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserAccountResponse> createAccount
            (@Valid @RequestBody CreateAccountRequest request){
        UserAccountResponse account = userAccountService.createAccount(request);
        URI location = ServletUriComponentsBuilder
                .fromCurrentContextPath()
                .path("/api/v1/admin/accounts/{accountId}")
                .buildAndExpand(account.id())
                .toUri();
        return ResponseEntity.created(location).body(account);
    }

    @GetMapping("/accounts/{accountId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserAccountResponse> getAccount(@PathVariable UUID accountId){
        return ResponseEntity.ok(userAccountService.findById(accountId));
    }

    @PatchMapping("/accounts/{accountId}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserAccountResponse> changeRole(
            @PathVariable UUID accountId,
            @Valid @RequestBody ChangeRoleRequest request
    ) {
        return ResponseEntity.ok(
                userAccountService.changeRole(accountId, request.role())
        );
    }

    @PatchMapping("/accounts/{accountId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserAccountResponse> changeStatus(
            @PathVariable UUID accountId,
            @Valid @RequestBody ChangeAccountStatusRequest request
    ) {
        return ResponseEntity.ok(
                userAccountService.changeStatus(accountId, request.status())
        );
    }

}
