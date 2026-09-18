package com.emssystem.emsauthservice.user;

import com.emssystem.emsauthservice.shared.exception.EmailAlreadyExistsException;
import com.emssystem.emsauthservice.shared.exception.UserNotFoundException;
import com.emssystem.emsauthservice.user.dto.request.CreateAccountRequest;
import com.emssystem.emsauthservice.user.dto.response.UserAccountResponse;
import com.emssystem.emsauthservice.user.entity.RoleType;
import com.emssystem.emsauthservice.user.entity.UserAccount;
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

import javax.management.relation.Role;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
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
    void createAccount_shouldNormalizeEmailEncodePasswordAndSaveAccount() {
        RoleType role = role();
        CreateAccountRequest request = new CreateAccountRequest(
                "  Employee@Example.COM  ",
                "plainPassword",
                role
        );

        when(userAccountRepository.existsByEmailIgnoreCase("employee@example.com"))
                .thenReturn(false);
        when(passwordEncoder.encode("plainPassword")).thenReturn("encoded-password");
        when(userAccountRepository.save(any(UserAccount.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UserAccountResponse response = userAccountService.createAccount(request);

        ArgumentCaptor<UserAccount> accountCaptor =
                ArgumentCaptor.forClass(UserAccount.class);
        verify(userAccountRepository).save(accountCaptor.capture());

        UserAccount savedAccount = accountCaptor.getValue();
        assertEquals("employee@example.com", savedAccount.getEmail());
        assertEquals("encoded-password", savedAccount.getPasswordHash());
        assertSame(role, savedAccount.getRole());
        assertTrue(savedAccount.isActive());

        assertEquals("employee@example.com", response.email());
        assertSame(role, response.role());
        assertTrue(response.active());

        verify(userAccountRepository)
                .existsByEmailIgnoreCase("employee@example.com");
        verify(passwordEncoder).encode("plainPassword");
    }

    @Test
    void createAccount_shouldThrowWhenEmailAlreadyExists() {
        RoleType role = role();
        CreateAccountRequest request = new CreateAccountRequest(
                " EXISTING@Example.com ",
                "plainPassword",
                role
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
    void findById_shouldReturnAccountWhenItExists() {
        UUID accountId = UUID.randomUUID();
        RoleType role = role();
        UserAccount account = account(accountId, role);

        when(userAccountRepository.findById(accountId))
                .thenReturn(Optional.of(account));

        UserAccountResponse response = userAccountService.findById(accountId);

        assertEquals(accountId, response.id());
        assertEquals("employee@example.com", response.email());
        assertSame(role, response.role());
        assertTrue(response.active());
        verify(userAccountRepository).findById(accountId);
    }

    @Test
    void findById_shouldThrowWhenAccountDoesNotExist() {
        UUID accountId = UUID.randomUUID();
        when(userAccountRepository.findById(accountId)).thenReturn(Optional.empty());

        UserNotFoundException exception = assertThrows(
                UserNotFoundException.class,
                () -> userAccountService.findById(accountId)
        );

        assertEquals("User account not found:" + accountId, exception.getMessage());
    }

    @Test
    void changeRole_shouldUpdateTheAccountRole() {
        UUID accountId = UUID.randomUUID();
        RoleType originalRole = role();
        RoleType newRole = role();
        UserAccount account = account(accountId, originalRole);

        when(userAccountRepository.findById(accountId))
                .thenReturn(Optional.of(account));

        UserAccountResponse response = userAccountService.changeRole(accountId, newRole);

        assertSame(newRole, account.getRole());
        assertSame(newRole, response.role());
        verify(userAccountRepository, never()).save(any(UserAccount.class));
    }

    @Test
    void deactivate_shouldMarkAccountAsInactive() {
        UUID accountId = UUID.randomUUID();
        UserAccount account = account(accountId, role());
        when(userAccountRepository.findById(accountId))
                .thenReturn(Optional.of(account));

        UserAccountResponse response = userAccountService.deactivate(accountId);

        assertFalse(account.isActive());
        assertFalse(response.active());
    }

    @Test
    void activate_shouldMarkAccountAsActive() {
        UUID accountId = UUID.randomUUID();
        UserAccount account = account(accountId, role());
        account.deactivate();
        when(userAccountRepository.findById(accountId))
                .thenReturn(Optional.of(account));

        UserAccountResponse response = userAccountService.activate(accountId);

        assertTrue(account.isActive());
        assertTrue(response.active());
    }

    @Test
    void changePassword_shouldReplacePasswordHashWhenCurrentPasswordMatches() {
        UUID accountId = UUID.randomUUID();
        UserAccount account = account(accountId, role());
        String originalHash = account.getPasswordHash();

        when(userAccountRepository.findById(accountId))
                .thenReturn(Optional.of(account));
        when(passwordEncoder.matches("currentPassword", originalHash))
                .thenReturn(true);
        when(passwordEncoder.encode("newPassword")).thenReturn("new-password-hash");

        userAccountService.changePassword(
                accountId,
                "currentPassword",
                "newPassword"
        );

        assertEquals("new-password-hash", account.getPasswordHash());
        verify(passwordEncoder).matches("currentPassword",originalHash);
        verify(passwordEncoder).encode("newPassword");
    }

    @Test
    void changePassword_shouldThrowWhenCurrentPasswordDoesNotMatch() {
        UUID accountId = UUID.randomUUID();
        UserAccount account = account(accountId, role());
        when(userAccountRepository.findById(accountId))
                .thenReturn(Optional.of(account));
        when(passwordEncoder.matches("wrongPassword", "old-password-hash"))
                .thenReturn(false);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> userAccountService.changePassword(
                        accountId,
                        "wrongPassword",
                        "newPassword"
                )
        );

        assertEquals("Current password is incorrect", exception.getMessage());
        assertEquals("old-password-hash", account.getPasswordHash());
        verify(passwordEncoder, never()).encode(any(String.class));
    }

    private UserAccount account(UUID accountId, RoleType role) {
        UserAccount account = new UserAccount(
                "employee@example.com",
                "old-password-hash",
                role
        );
        ReflectionTestUtils.setField(account, "id", accountId);
        return account;
    }

    private RoleType role() {
        return org.mockito.Mockito.mock(RoleType.class);
    }
}
