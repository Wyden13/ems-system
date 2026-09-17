package com.emssystem.emsauthservice.security.userdetails;

import com.emssystem.emsauthservice.user.entity.UserAccount;
import com.emssystem.emsauthservice.user.repository.UserAccountRepository;
import jakarta.transaction.Transactional;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Optional;

@Service
@Transactional
public class AccountUserDetailsService implements UserDetailsService {
    private final UserAccountRepository userAccountRepository;

    public AccountUserDetailsService(UserAccountRepository userAccountRepository){
        this.userAccountRepository = userAccountRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        if(email.isBlank()){
            throw new UsernameNotFoundException("Invalid email or password");
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        UserAccount account = userAccountRepository.
                findByEmailIgnoreCase(normalizedEmail);
        return AccountPrincipal.from(account);
    }
}
