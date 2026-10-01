package com.emssystem.emsemployeeservice.shared.config;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration(proxyBeanMethods = false)
@EnableJpaAuditing(dateTimeProviderRef = "postgresDateTimeProvider")
public class JpaAuditingConfig {
    @Bean
    DateTimeProvider postgresDateTimeProvider() {
        // Match PostgreSQL precision so responses stay identical after a reload.
        return () -> Optional.of(Instant.now().truncatedTo(ChronoUnit.MICROS));
    }
}
