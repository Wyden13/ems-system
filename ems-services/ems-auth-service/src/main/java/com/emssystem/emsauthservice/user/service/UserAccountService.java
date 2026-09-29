package com.emssystem.emsauthservice.user.service;

import com.emssystem.emsauthservice.shared.exception.EmailAlreadyExistsException;
import com.emssystem.emsauthservice.shared.exception.UserNotFoundException;
import com.emssystem.emsauthservice.user.dto.request.CreateAccountRequest;
import com.emssystem.emsauthservice.user.dto.response.UserAccountResponse;
import com.emssystem.emsauthservice.user.enums.AccountStatus;
import com.emssystem.emsauthservice.user.enums.RoleType;
import com.emssystem.emsauthservice.user.entity.UserAccount;
import com.emssystem.emsauthservice.user.repository.UserAccountRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.UUID;


@Service
@Transactional
public class UserAccountService {
    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.emssystem.emsauthservice.security.service.IdentityLock identityLock;
    private final com.emssystem.emsauthservice.security.service.RefreshTokenService sessions;

    /**
     * Class Constructor
     * @param userAccountRepository
     * @param passwordEncoder
     */
    public UserAccountService(
            UserAccountRepository userAccountRepository,
            PasswordEncoder passwordEncoder,
            com.emssystem.emsauthservice.security.service.IdentityLock identityLock,
            com.emssystem.emsauthservice.security.service.RefreshTokenService sessions
    ){
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder; this.identityLock=identityLock; this.sessions=sessions;
    }

    /**
     * Create a new user account.
     * @param request
     * @return
     */
    @PreAuthorize("hasRole('ADMIN')")
    public UserAccountResponse createAccount(CreateAccountRequest request) {
        identityLock.acquire();
        String normalizedEmail = normalizeEmail(request.email());

        if (userAccountRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new EmailAlreadyExistsException("Email already exists!");
        }
        String passwordHash = passwordEncoder.encode(request.password());

        UserAccount account = new UserAccount(normalizedEmail, passwordHash, request.role());
        UserAccount savedAccount = userAccountRepository.save(account);
        return UserAccountResponse.from(savedAccount);
    }

    /**
     * Finds an account by its unique identifier
     * @param accountId
     * @return
     */
    @Transactional(readOnly = true)
    public UserAccountResponse findById(UUID accountId) {
        UserAccount account = findAccount(accountId);
        return UserAccountResponse.from(account);
    }

    /**
     * Changes the authorization role assigned to an account.
     * @param accountId
     * @param newRole
     * @return
     */
    @PreAuthorize("hasRole('ADMIN')")
    public UserAccountResponse changeRole(UUID accountId, RoleType newRole){
        identityLock.acquire();
        UserAccount account = findAccount(accountId);
        // JPA automatically detects changes to a managed entity inside a transaction.
        // methods such as changeRole() don't need explicit save() call:
        guardAdministrator(account, newRole, account.getStatus());
        account.changeRole(newRole);
        sessions.revokeAll(accountId);
        return UserAccountResponse.from(account);
    }


    /**
     * Deactivate an account
     * @param accountId
     * @return UserAccountResponse
     */
    @PreAuthorize("hasRole('ADMIN')")
    public UserAccountResponse changeStatus(UUID accountId, AccountStatus status){
        identityLock.acquire();
        UserAccount account = findAccount(accountId);
        guardAdministrator(account, account.getRole(), status);
        account.changeStatus(status);
        sessions.revokeAll(accountId);
        return UserAccountResponse.from(account);
    }

    /**
     * Change an account's password after verifying the current password
     * @param accountId
     * @param currentPassword
     * @param newPassword
     */
    @PreAuthorize("isAuthenticated()")
    public void changePassword(UUID accountId, String currentPassword, String newPassword){
        identityLock.acquire();
        UserAccount account = findAccount(accountId);

        // If password input does not match the password stored in the database
        if(!passwordEncoder.matches(currentPassword,account.getPasswordHash())){
            throw new IllegalArgumentException("Current password is incorrect");
        }
        String newPasswordHash = passwordEncoder.encode(newPassword);
        account.changePassword(newPasswordHash);
        sessions.revokeAll(accountId);
    }

    @PreAuthorize("isAuthenticated()")
    public UserAccountResponse updateOwnProfile(
            UUID accountId,
            String requestedEmail
    ) {
        identityLock.acquire();
        UserAccount account = findAccount(accountId);
        String normalizedEmail = normalizeEmail(requestedEmail);

        boolean emailChanged = !account.getEmail().equalsIgnoreCase(normalizedEmail);
        if (emailChanged
                && userAccountRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new EmailAlreadyExistsException("Email already exists");
        }

        if (emailChanged) {
            account.changeEmail(normalizedEmail);
        }

        return UserAccountResponse.from(account);
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<UserAccountResponse> list(String search, RoleType role, AccountStatus status, org.springframework.data.domain.Pageable pageable) {
        return userAccountRepository.findAll((root, query, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            if (search != null && !search.isBlank()) predicates.add(cb.like(cb.lower(root.get("email")), "%" + search.trim().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%", '\\'));
            if (role != null) predicates.add(cb.equal(root.get("role"),role));
            if (status != null) predicates.add(cb.equal(root.get("status"),status));
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        }, pageable).map(UserAccountResponse::from);
    }
    private void guardAdministrator(UserAccount account, RoleType role, AccountStatus status) {
        boolean removesAdmin = account.getRole() == RoleType.ADMIN && account.getStatus() == AccountStatus.ACTIVE
            && (role != RoleType.ADMIN || status != AccountStatus.ACTIVE);
        if (!removesAdmin) return;
        var actor = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (actor != null && account.getId().toString().equals(actor.getName()))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"You cannot demote or disable your own administrator account");
        if (userAccountRepository.countByRoleAndStatus(RoleType.ADMIN,AccountStatus.ACTIVE) <= 1)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"At least one active administrator must remain");
    }
    private UserAccount findAccount(UUID accountId){
        return userAccountRepository.findById(accountId).
                orElseThrow(()-> new UserNotFoundException(
                        "User account not found:"+accountId
                ));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

}
