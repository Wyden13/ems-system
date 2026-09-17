package com.emssystem.emsauthservice.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/**
 * File: JpaAuditingConfig.java
 * Purpose: Enables automatic tracking of when database records are created or modified,
 * It tracks who created or modified database records and when it happened
 */

@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorProvider") // Enables JPA Auditing
public class JpaAuditingConfig {
    @Bean
    public AuditorAware<String> auditorProvider(){
        // This fetches the current logged-in user (Spring Security)
        return () -> Optional.ofNullable(
                SecurityContextHolder.getContext()
                        .getAuthentication()
                        .getName()
        );
    }
}
