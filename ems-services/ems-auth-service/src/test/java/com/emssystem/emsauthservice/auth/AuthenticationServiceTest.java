package com.emssystem.emsauthservice.auth;

import com.emssystem.emsauthservice.auth.dto.request.LoginRequest;
import com.emssystem.emsauthservice.auth.dto.request.RefreshTokenRequest;
import com.emssystem.emsauthservice.auth.dto.response.LoginResponse;
import com.emssystem.emsauthservice.auth.service.AuthenticationService;
import com.emssystem.emsauthservice.security.service.JwtService;
import com.emssystem.emsauthservice.security.service.RefreshTokenService;
import com.emssystem.emsauthservice.user.entity.UserAccount;
import com.emssystem.emsauthservice.user.enums.AccountStatus;
import com.emssystem.emsauthservice.user.repository.UserAccountRepository;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.eq;

@ExtendWith(MockitoExtension.class)
public class AuthenticationServiceTest {
    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private AuthenticationService authenticationService;

    @Test
    void login_shouldNormalizeEmailAndReturnTokensForValidCredentials(){
        LoginRequest request = new LoginRequest(" USER@Example.com","correct-password");
        UserAccount account = activeLoginAccount("stored-password-hash");
        Instant expiresAt = Instant.parse("2030-01-01T00:15:00Z");

        when(userAccountRepository.findByEmailIgnoreCase("user@example.com"))
                .thenReturn(account);
        when(passwordEncoder.matches("correct-password","stored-password-hash"))
                .thenReturn(true);
        when(jwtService.issuedAccessToken(any(UserAccount.class),any(Instant.class)))
                .thenReturn(new JwtService.IssuedAccessToken("access-token",expiresAt));
        when(refreshTokenService.issue(any(UserAccount.class), any(Instant.class)))
                .thenReturn("refresh-token");
        LoginResponse response = authenticationService.login(request);
        assertEquals("access-token",response.accessToken());
        assertEquals("refresh-token",response.refreshToken());
        assertEquals("Bearer",response.tokenType());
        assertEquals(expiresAt,response.expiresAt());

        ArgumentCaptor<Instant> accessIssuedAt = ArgumentCaptor.forClass(Instant.class);
        ArgumentCaptor<Instant> refreshIssuedAt = ArgumentCaptor.forClass(Instant.class);
        verify(jwtService).issuedAccessToken(
                eq(account),
                accessIssuedAt.capture()
        );

        verify(refreshTokenService).issue(
                eq(account),
                refreshIssuedAt.capture()
        );
        assertEquals(accessIssuedAt.getValue(), refreshIssuedAt.getValue());
    }
    @Test
    void login_shouldRejectUnknownEmailWithoutCheckingPassword() {
        LoginRequest request = new LoginRequest("missing@example.com", "password");
        when(userAccountRepository.findByEmailIgnoreCase("missing@example.com"))
                .thenReturn(null);

        BadCredentialsException exception = assertThrows(
                BadCredentialsException.class,
                () -> authenticationService.login(request)
        );

        assertEquals("Invalid email or password", exception.getMessage());
        verifyNoInteractions(passwordEncoder, jwtService, refreshTokenService);
    }

    @Test
    void login_shouldRejectIncorrectPasswordWithGenericMessage() {
        LoginRequest request = new LoginRequest("user@example.com", "wrong-password");
        UserAccount account = org.mockito.Mockito.mock(UserAccount.class);
        when(account.getPasswordHash()).thenReturn("stored-password-hash");

        when(userAccountRepository.findByEmailIgnoreCase("user@example.com"))
                .thenReturn(account);
        when(passwordEncoder.matches("wrong-password", "stored-password-hash"))
                .thenReturn(false);

        BadCredentialsException exception = assertThrows(
                BadCredentialsException.class,
                () -> authenticationService.login(request)
        );

        assertEquals("Invalid email or password", exception.getMessage());
        verifyNoInteractions(jwtService, refreshTokenService);
    }
    @Test
    void login_shouldRejectInactiveAccountBeforeIssuingTokens(){
        LoginRequest request = new LoginRequest("user@example.com","correct-password");
        UserAccount account = loginAccount("stored-password-hash",AccountStatus.SUSPENDED);
        when(userAccountRepository.findByEmailIgnoreCase("user@example.com"))
                .thenReturn(account);
        when(passwordEncoder.matches("correct-password","stored-password-hash"))
                .thenReturn(true);
        DisabledException exception = assertThrows(
                DisabledException.class,
                ()->authenticationService.login(request)
        );
        assertEquals("Account is not active", exception.getMessage());
        verifyNoInteractions(jwtService,refreshTokenService);
    }
    @Test
    void refresh_shouldRotateRefreshTokenAndReturnNewTokenPair() {
        RefreshTokenRequest request = new RefreshTokenRequest("old-refresh-token");
        UserAccount account = accountWithStatus(AccountStatus.ACTIVE);
        Instant expiresAt = Instant.parse("2030-01-01T00:15:00Z");

        when(refreshTokenService.rotate(
                eq("old-refresh-token"),
                any(Instant.class)
        )).thenReturn(new RefreshTokenService.RotatedRefreshToken(
                account,
                "new-refresh-token"
        ));

        when(jwtService.issuedAccessToken(any(UserAccount.class), any(Instant.class)))
                .thenReturn(new JwtService.IssuedAccessToken("new-access-token", expiresAt));

        LoginResponse response = authenticationService.refresh(request);

        assertEquals("new-access-token", response.accessToken());
        assertEquals("new-refresh-token", response.refreshToken());
        assertEquals("Bearer", response.tokenType());
        assertEquals(expiresAt, response.expiresAt());

        ArgumentCaptor<Instant> rotationTime = ArgumentCaptor.forClass(Instant.class);
        ArgumentCaptor<Instant> accessIssuedAt = ArgumentCaptor.forClass(Instant.class);
        verify(refreshTokenService).rotate(
                eq("old-refresh-token"),
                rotationTime.capture()
        );

        verify(jwtService).issuedAccessToken(
                eq(account),
                accessIssuedAt.capture()
        );
        assertEquals(rotationTime.getValue(), accessIssuedAt.getValue());
    }
    @Test
    void refresh_shouldRejectInactiveAccountBeforeIssuingAccessToken() {
        RefreshTokenRequest request = new RefreshTokenRequest("refresh-token");
        UserAccount account = accountWithStatus(AccountStatus.DISABLED);

        when(refreshTokenService.rotate(
                eq("refresh-token"),
                any(Instant.class)
        )).thenReturn(new RefreshTokenService.RotatedRefreshToken(
                account,
                "replacement-token"
        ));

        DisabledException exception = assertThrows(
                DisabledException.class,
                () -> authenticationService.refresh(request)
        );

        assertEquals("Account is not active", exception.getMessage());
        verify(jwtService, never()).issuedAccessToken(any(), any());
    }
    @Test
    void refresh_shouldPropagateInvalidRefreshTokenFailure() {
        RefreshTokenRequest request = new RefreshTokenRequest("invalid-refresh-token");
        BadCredentialsException expected =
                new BadCredentialsException("Invalid refresh token");

        when(refreshTokenService.rotate(
                eq("invalid-refresh-token"),
                any(Instant.class)
        )).thenThrow(expected);

        BadCredentialsException actual = assertThrows(
                BadCredentialsException.class,
                () -> authenticationService.refresh(request)
        );

        assertSame(expected, actual);
        verifyNoInteractions(jwtService);
    }


    private UserAccount activeLoginAccount(String passwordHash){
        return loginAccount(passwordHash, AccountStatus.ACTIVE);
    }
    private UserAccount loginAccount(String passwordHash, AccountStatus status){
        UserAccount account = accountWithStatus(status);
        when(account.getPasswordHash()).thenReturn(passwordHash);
        return account;
    }
    private UserAccount accountWithStatus(AccountStatus status){
        UserAccount account = org.mockito.Mockito.mock(UserAccount.class);
        when(account.getStatus()).thenReturn(status);
        return account;
    }
}
