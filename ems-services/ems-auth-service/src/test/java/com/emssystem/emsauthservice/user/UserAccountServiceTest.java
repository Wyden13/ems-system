package com.emssystem.emsauthservice.user;

import com.emssystem.emsauthservice.shared.exception.EmailAlreadyExistsException;
import com.emssystem.emsauthservice.shared.exception.UserNotFoundException;
import com.emssystem.emsauthservice.user.dto.request.CreateAccountRequest;
import com.emssystem.emsauthservice.user.dto.response.UserAccountResponse;
import com.emssystem.emsauthservice.user.entity.UserAccount;
import com.emssystem.emsauthservice.user.enums.AccountStatus;
import com.emssystem.emsauthservice.user.enums.RoleType;
import com.emssystem.emsauthservice.user.repository.UserAccountRepository;
import com.emssystem.emsauthservice.user.service.UserAccountService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserAccountServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserAccountService userAccountService;

    @Test
    void createAccount_shouldNormalizeEmailEncodePasswordAndSaveActiveAccount() {
        UUID generatedId = UUID.randomUUID();
        Instant createdAt = Instant.parse("2026-09-18T12:00:00Z");
        Instant updatedAt = Instant.parse("2026-09-18T12:00:00Z");
        CreateAccountRequest request = new CreateAccountRequest(
                "  Employee@Example.COM  ",
                "SecurePassword123",
                RoleType.EMPLOYEE
        );

        when(userAccountRepository.existsByEmailIgnoreCase("employee@example.com"))
                .thenReturn(false);
        when(passwordEncoder.encode("SecurePassword123"))
                .thenReturn("encoded-password");
        when(userAccountRepository.save(any(UserAccount.class)))
                .thenAnswer(invocation -> {
                    UserAccount account = invocation.getArgument(0);
                    ReflectionTestUtils.setField(account, "id", generatedId);
                    ReflectionTestUtils.setField(account, "createdAt", createdAt);
                    ReflectionTestUtils.setField(account, "updatedAt", updatedAt);
                    return account;
                });

        UserAccountResponse response = userAccountService.createAccount(request);

        ArgumentCaptor<UserAccount> accountCaptor =
                ArgumentCaptor.forClass(UserAccount.class);
        verify(userAccountRepository).save(accountCaptor.capture());

        UserAccount savedAccount = accountCaptor.getValue();
        assertEquals("employee@example.com", savedAccount.getEmail());
        assertEquals("encoded-password", savedAccount.getPasswordHash());
        assertEquals(RoleType.EMPLOYEE, savedAccount.getRole());
        assertEquals(AccountStatus.ACTIVE, savedAccount.getStatus());

        assertEquals(generatedId, response.id());
        assertEquals("employee@example.com", response.email());
        assertEquals(RoleType.EMPLOYEE, response.role());
        assertEquals(AccountStatus.ACTIVE, response.status());
        assertEquals(createdAt, response.createdAt());
        assertEquals(updatedAt, response.updatedAt());

        verify(userAccountRepository)
                .existsByEmailIgnoreCase("employee@example.com");
        verify(passwordEncoder).encode("SecurePassword123");
    }

    @Test
    void createAccount_shouldThrowWhenNormalizedEmailAlreadyExists() {
        CreateAccountRequest request = new CreateAccountRequest(
                " EXISTING@Example.com ",
                "SecurePassword123",
                RoleType.EMPLOYEE
        );

        when(userAccountRepository.existsByEmailIgnoreCase("existing@example.com"))
                .thenReturn(true);

        EmailAlreadyExistsException exception = assertThrows(
                EmailAlreadyExistsException.class,
                () -> userAccountService.createAccount(request)
        );

        assertEquals("Email already exists!", exception.getMessage());
        verify(userAccountRepository)
                .existsByEmailIgnoreCase("existing@example.com");
        verify(userAccountRepository, never()).save(any(UserAccount.class));
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void findById_shouldReturnMappedAccountWhenItExists() {
        UUID accountId = UUID.randomUUID();
        Instant createdAt = Instant.parse("2026-09-18T12:00:00Z");
        Instant updatedAt = Instant.parse("2026-09-18T13:00:00Z");
        Instant lastLoginAt = Instant.parse("2026-09-18T14:00:00Z");
        UserAccount account = account(accountId, RoleType.EMPLOYEE);
        ReflectionTestUtils.setField(account, "createdAt", createdAt);
        ReflectionTestUtils.setField(account, "updatedAt", updatedAt);
        ReflectionTestUtils.setField(account, "lastLoginAt", lastLoginAt);

        when(userAccountRepository.findById(accountId))
                .thenReturn(Optional.of(account));

        UserAccountResponse response = userAccountService.findById(accountId);

        assertEquals(accountId, response.id());
        assertEquals("employee@example.com", response.email());
        assertEquals(RoleType.EMPLOYEE, response.role());
        assertEquals(AccountStatus.ACTIVE, response.status());
        assertEquals(createdAt, response.createdAt());
        assertEquals(updatedAt, response.updatedAt());
        assertEquals(lastLoginAt, response.lastLoginAt());
        verify(userAccountRepository).findById(accountId);
    }

    @Test
    void findById_shouldThrowWhenAccountDoesNotExist() {
        UUID accountId = UUID.randomUUID();
        when(userAccountRepository.findById(accountId))
                .thenReturn(Optional.empty());

        UserNotFoundException exception = assertThrows(
                UserNotFoundException.class,
                () -> userAccountService.findById(accountId)
        );

        assertEquals("User account not found:" + accountId, exception.getMessage());
    }

    @Test
    void changeRole_shouldUpdateRoleWithoutExplicitRepositorySave() {
        UUID accountId = UUID.randomUUID();
        UserAccount account = account(accountId, RoleType.EMPLOYEE);
        when(userAccountRepository.findById(accountId))
                .thenReturn(Optional.of(account));

        UserAccountResponse response =
                userAccountService.changeRole(accountId, RoleType.MANAGER);

        assertEquals(RoleType.MANAGER, account.getRole());
        assertEquals(RoleType.MANAGER, response.role());
        verify(userAccountRepository, never()).save(any(UserAccount.class));
    }

    @Test
    void changeStatus_shouldUpdateStatusWithoutExplicitRepositorySave() {
        UUID accountId = UUID.randomUUID();
        UserAccount account = account(accountId, RoleType.EMPLOYEE);
        when(userAccountRepository.findById(accountId))
                .thenReturn(Optional.of(account));

        UserAccountResponse response =
                userAccountService.changeStatus(accountId, AccountStatus.SUSPENDED);

        assertEquals(AccountStatus.SUSPENDED, account.getStatus());
        assertEquals(AccountStatus.SUSPENDED, response.status());
        verify(userAccountRepository, never()).save(any(UserAccount.class));
    }

    @Test
    void changePassword_shouldReplaceHashWhenCurrentPasswordMatches() {
        UUID accountId = UUID.randomUUID();
        UserAccount account = account(accountId, RoleType.EMPLOYEE);
        String originalHash = account.getPasswordHash();

        when(userAccountRepository.findById(accountId))
                .thenReturn(Optional.of(account));
        when(passwordEncoder.matches("currentPassword", originalHash))
                .thenReturn(true);
        when(passwordEncoder.encode("NewSecurePassword123"))
                .thenReturn("new-password-hash");

        userAccountService.changePassword(
                accountId,
                "currentPassword",
                "NewSecurePassword123"
        );

        assertEquals("new-password-hash", account.getPasswordHash());
        verify(passwordEncoder).matches("currentPassword", originalHash);
        verify(passwordEncoder).encode("NewSecurePassword123");
        verify(userAccountRepository, never()).save(any(UserAccount.class));
    }

    @Test
    void changePassword_shouldThrowAndKeepHashWhenCurrentPasswordDoesNotMatch() {
        UUID accountId = UUID.randomUUID();
        UserAccount account = account(accountId, RoleType.EMPLOYEE);
        String originalHash = account.getPasswordHash();

        when(userAccountRepository.findById(accountId))
                .thenReturn(Optional.of(account));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> userAccountService.changePassword(
                        accountId,
                        "wrongPassword",
                        "NewSecurePassword123"
                )
        );

        assertEquals("Current password is incorrect", exception.getMessage());
        assertEquals(originalHash, account.getPasswordHash());
        verify(passwordEncoder).matches("wrongPassword", originalHash);
        verify(passwordEncoder, never()).encode(anyString());
    }

    private UserAccount account(UUID accountId, RoleType role) {
        UserAccount account;
        account = new UserAccount(
                "employee@example.com",
                "old-password-hash",
                role
        );
        ReflectionTestUtils.setField(account, "id", accountId);
        return account;
    }
}
