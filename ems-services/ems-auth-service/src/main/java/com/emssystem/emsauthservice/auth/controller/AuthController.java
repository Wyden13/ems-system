package com.emssystem.emsauthservice.auth.controller;

import com.emssystem.emsauthservice.auth.dto.request.LoginRequest;
import com.emssystem.emsauthservice.auth.dto.request.RefreshTokenRequest;
import com.emssystem.emsauthservice.auth.dto.response.LoginResponse;
import com.emssystem.emsauthservice.auth.service.AuthenticationService;
import com.emssystem.emsauthservice.security.entity.RefreshToken;
import jakarta.validation.Valid;
import lombok.extern.java.Log;
import org.apache.coyote.Response;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/v1/auth")
public class AuthController {
    private final AuthenticationService authenticationService;

    public AuthController(AuthenticationService authenticationService){
        this.authenticationService = authenticationService;
    }
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request){
        LoginResponse response = authenticationService.login(request);
        return tokenResponse(response);
    }
    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(@Valid @RequestBody RefreshTokenRequest request){
        LoginResponse response = authenticationService.refresh(request);
        return tokenResponse(response);
    }

    private ResponseEntity<LoginResponse> tokenResponse(LoginResponse response){
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.PRAGMA,"no-cache")
                .body(response);
    }
}
