CREATE TABLE user_account (
 id UUID PRIMARY KEY, email VARCHAR(320) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
 active VARCHAR(20) NOT NULL, role VARCHAR(30) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL, last_login_at TIMESTAMPTZ,
 CONSTRAINT ck_account_status CHECK (active IN ('ACTIVE','SUSPENDED','DISABLED')),
 CONSTRAINT ck_account_role CHECK (role IN ('EMPLOYEE','SUPERVISOR','MANAGER','ADMIN'))
);
CREATE UNIQUE INDEX uk_account_email_lower ON user_account (lower(email));
CREATE TABLE refresh_tokens (
 id UUID PRIMARY KEY, user_account_id UUID NOT NULL REFERENCES user_account(id),
 token_hash VARCHAR(64) NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ
);
CREATE INDEX idx_refresh_token_account ON refresh_tokens(user_account_id);
