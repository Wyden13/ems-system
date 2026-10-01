CREATE TABLE employees (
  id BIGSERIAL PRIMARY KEY, employee_number VARCHAR(40) NOT NULL, first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL, email VARCHAR(320) NOT NULL, contact_number VARCHAR(40), address VARCHAR(500),
  birth_date DATE, hire_date DATE NOT NULL, department_id BIGINT NOT NULL, role VARCHAR(30) NOT NULL,
  user_account_id UUID, pay_rate NUMERIC(19,2) NOT NULL, job_title VARCHAR(100), active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT ck_employee_department_positive CHECK (department_id > 0),
  CONSTRAINT ck_employee_pay_rate_nonnegative CHECK (pay_rate >= 0),
  CONSTRAINT uk_employee_number UNIQUE(employee_number), CONSTRAINT uk_employee_email UNIQUE(email), CONSTRAINT uk_employee_account UNIQUE(user_account_id)
);
CREATE INDEX idx_employee_department ON employees(department_id);
CREATE INDEX idx_employee_active_department ON employees(active, department_id);
