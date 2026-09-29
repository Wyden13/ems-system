package com.emssystem.emsauthservice.shared.config;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
/** Timestamp auditing also applies to unauthenticated login and bootstrap operations. */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {}
