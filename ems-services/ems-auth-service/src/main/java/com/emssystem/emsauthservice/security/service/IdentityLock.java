package com.emssystem.emsauthservice.security.service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
/** Serializes account/session mutations across application instances in PostgreSQL. */
@Component
public class IdentityLock {
    private final JdbcTemplate jdbc;
    public IdentityLock(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public void acquire() { jdbc.execute("SELECT pg_advisory_xact_lock(693018247)"); }
}
