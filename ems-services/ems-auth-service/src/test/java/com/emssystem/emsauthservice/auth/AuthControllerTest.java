package com.emssystem.emsauthservice.auth;

import com.emssystem.emsauthservice.auth.controller.AuthController;
import com.emssystem.emsauthservice.auth.dto.request.LoginRequest;
import com.emssystem.emsauthservice.auth.dto.request.RefreshTokenRequest;
import com.emssystem.emsauthservice.auth.dto.response.LoginResponse;
import com.emssystem.emsauthservice.auth.service.AuthenticationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
//@AutoConfigureMockMvc(addFilters = false)
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthenticationService authenticationService;

    @Test
    void login_WithValidCredentials_ReturnsTokensAndNoCacheHeaders() throws Exception {
        LoginRequest request = new LoginRequest("employee@example.com", "Password123!");
        LoginResponse response = new LoginResponse(
                "access-token",
                "refresh-token",
                Instant.parse("2026-09-20T01:00:00Z")
        );

        when(authenticationService.login(request)).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "employee@example.com",
                                  "password": "Password123!"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(header().string(HttpHeaders.PRAGMA, "no-cache"))
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.refreshToken").value("refresh-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresAt").value("2026-09-20T01:00:00Z"));

        verify(authenticationService).login(request);
    }

    @Test
    void login_WithInvalidRequest_ReturnsBadRequestWithoutCallingService() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "not-an-email",
                                  "password": ""
                                }
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(authenticationService);
    }

    @Test
    void refresh_WithValidToken_ReturnsNewTokensAndNoCacheHeaders() throws Exception {
        RefreshTokenRequest request = new RefreshTokenRequest("valid-refresh-token");
        LoginResponse response = new LoginResponse(
                "new-access-token",
                "new-refresh-token",
                Instant.parse("2026-09-20T02:00:00Z")
        );

        when(authenticationService.refresh(request)).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "refreshToken": "valid-refresh-token"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(header().string(HttpHeaders.PRAGMA, "no-cache"))
                .andExpect(jsonPath("$.accessToken").value("new-access-token"))
                .andExpect(jsonPath("$.refreshToken").value("new-refresh-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresAt").value("2026-09-20T02:00:00Z"));

        verify(authenticationService).refresh(request);
    }

    @Test
    void refresh_WithBlankToken_ReturnsBadRequestWithoutCallingService() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "refreshToken": ""
                                }
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(authenticationService);
    }
}
