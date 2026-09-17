package com.emssystem.emsauthservice.user.repository;

import com.emssystem.emsauthservice.user.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {
    UserAccount findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    Optional<UserAccount> findById(UUID accountId);
}
