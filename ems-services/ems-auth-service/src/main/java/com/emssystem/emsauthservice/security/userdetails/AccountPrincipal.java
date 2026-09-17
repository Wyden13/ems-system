package com.emssystem.emsauthservice.security.userdetails;

import com.emssystem.emsauthservice.user.entity.AccountRole;
import com.emssystem.emsauthservice.user.entity.UserAccount;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public record AccountPrincipal(
        UUID accountId,
        String email,
        String passwordHash,
        AccountRole role,
        boolean active
) implements UserDetails {

    public static AccountPrincipal from(UserAccount account) {
        return new AccountPrincipal(
                account.getId(),
                account.getEmail(),
                account.getPasswordHash(),
                account.getRole(),
                account.isActive()
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(
                new SimpleGrantedAuthority(
                        "ROLE_" + role
                )
        );
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}