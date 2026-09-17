package com.emssystem.emsauthservice.user.service;

import com.emssystem.emsauthservice.shared.exception.EmailAlreadyExistsException;
import com.emssystem.emsauthservice.shared.exception.UserNotFoundException;
import com.emssystem.emsauthservice.user.dto.request.CreateAccountRequest;
import com.emssystem.emsauthservice.user.dto.response.UserAccountResponse;
import com.emssystem.emsauthservice.user.entity.AccountRole;
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

    /**
     * Class Constructor
     * @param userAccountRepository
     * @param passwordEncoder
     */
    public UserAccountService(
            UserAccountRepository userAccountRepository,
            PasswordEncoder passwordEncoder
    ){
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Create a new user account.
     * @param request
     * @return
     */
    @PreAuthorize("hasRole('ADMIN')")
    public UserAccountResponse createAccount(CreateAccountRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);

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
    public UserAccountResponse changeRole(UUID accountId, AccountRole newRole){
        UserAccount account = findAccount(accountId);
        // JPA automatically detects changes to a managed entity inside a transaction.
        // methods such as changeRole() don't need explicit save() call:
        account.changeRole(newRole);
        return UserAccountResponse.from(account);
    }

    /**
     * activate an account
     * @param accountId
     * @return UserAccountResponse
     */
    @PreAuthorize("hasRole('ADMIN')")
    public UserAccountResponse activate(UUID accountId){
        UserAccount account = findAccount(accountId);
        account.activate();
        return UserAccountResponse.from(account);
    }

    /**
     * Deactivate an account
     * @param accountId
     * @return UserAccountResponse
     */
    @PreAuthorize("hasRole('ADMIN')")
    public UserAccountResponse deactivate(UUID accountId){
        UserAccount account = findAccount(accountId);
        account.deactivate();
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
        UserAccount account = findAccount(accountId);

        // If password input does not match the password stored in the database
        if(!passwordEncoder.matches(currentPassword,account.getPasswordHash())){
            throw new IllegalArgumentException("Current password is incorrect");
        }
        String newPasswordHash = passwordEncoder.encode(newPassword);
        account.changePassword(newPasswordHash);
    }

    private UserAccount findAccount(UUID accountId){
        return userAccountRepository.findById(accountId).
                orElseThrow(()-> new UserNotFoundException(
                        "User account not found:"+accountId
                ));
    }
}
