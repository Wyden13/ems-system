CREATE TABLE time_entries (
  id BIGSERIAL PRIMARY KEY, employee_id BIGINT NOT NULL, clock_in TIMESTAMPTZ NOT NULL, clock_out TIMESTAMPTZ,
  source VARCHAR(30) NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'OPEN', worked_minutes INTEGER NOT NULL DEFAULT 0,
  overtime_minutes INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_time_entry_employee_clock_in ON time_entries(employee_id, clock_in);
CREATE INDEX idx_time_entry_status_clock_in ON time_entries(status, clock_in);
CREATE TABLE time_entry_adjustments (
  id BIGSERIAL PRIMARY KEY, time_entry_id BIGINT NOT NULL REFERENCES time_entries(id), adjusted_by UUID NOT NULL,
  original_clock_in TIMESTAMPTZ NOT NULL, original_clock_out TIMESTAMPTZ, reason VARCHAR(500) NOT NULL,
  adjusted_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_adjustment_time_entry ON time_entry_adjustments(time_entry_id);
