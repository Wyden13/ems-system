package com.emssystem.emsauthservice.user.repository;

import com.emssystem.emsauthservice.user.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.security.authentication.BadCredentialsException;

import javax.swing.text.html.Option;
import java.util.UUID;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, UUID> {
    UserAccount findByEmailIgnoreCase(String email) throws  BadCredentialsException;
    boolean existsByEmailIgnoreCase(String email);
}
