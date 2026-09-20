package com.emssystem.emsauthservice.security.userdetails;

import com.emssystem.emsauthservice.user.enums.AccountStatus;
import com.emssystem.emsauthservice.user.enums.RoleType;
import com.emssystem.emsauthservice.user.entity.UserAccount;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public record AccountPrincipal(
        UUID accountId,
        String email,
        String passwordHash,
        RoleType role,
        AccountStatus status
) implements UserDetails {

    public static AccountPrincipal from(UserAccount account) {
        return new AccountPrincipal(
                account.getId(),
                account.getEmail(),
                account.getPasswordHash(),
                account.getRole(),
                account.getStatus()
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

//    @Override
    public boolean isActive() {
        return status == AccountStatus.ACTIVE;
    }
}