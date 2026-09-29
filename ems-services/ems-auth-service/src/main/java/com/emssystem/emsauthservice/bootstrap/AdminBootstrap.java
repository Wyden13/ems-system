package com.emssystem.emsauthservice.bootstrap;
import com.emssystem.emsauthservice.user.entity.UserAccount;
import com.emssystem.emsauthservice.user.enums.*;
import com.emssystem.emsauthservice.user.repository.UserAccountRepository;
import com.emssystem.emsauthservice.security.service.IdentityLock;
import org.springframework.boot.*;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.support.TransactionTemplate;
@Component @Profile("bootstrap")
public class AdminBootstrap implements ApplicationRunner {
    private final UserAccountRepository accounts; private final PasswordEncoder encoder; private final IdentityLock lock;
    private final TransactionTemplate transactions; private final String email; private final String password;
    public AdminBootstrap(UserAccountRepository accounts, PasswordEncoder encoder, IdentityLock lock, TransactionTemplate transactions,
            @Value("${BOOTSTRAP_ADMIN_EMAIL}") String email, @Value("${BOOTSTRAP_ADMIN_PASSWORD}") String password) {
        this.accounts=accounts;this.encoder=encoder;this.lock=lock;this.transactions=transactions;this.email=email;this.password=password;
    }
    @Override public void run(ApplicationArguments args) {
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || password.length()<8 || password.length()>120)
            throw new IllegalArgumentException("Provide a valid bootstrap email and a password of 8–120 characters");
        transactions.executeWithoutResult(status -> {
            lock.acquire();
            if (accounts.countByRoleAndStatus(RoleType.ADMIN,AccountStatus.ACTIVE)>0) return;
            String normalized=email.trim().toLowerCase(java.util.Locale.ROOT);
            if (accounts.existsByEmailIgnoreCase(normalized)) throw new IllegalStateException("Bootstrap will not overwrite an existing account");
            accounts.saveAndFlush(new UserAccount(normalized,encoder.encode(password),RoleType.ADMIN));
        });
    }
}
