ALTER TABLE time_entries ADD COLUMN request_id UUID;
ALTER TABLE time_entries ADD COLUMN worked_seconds BIGINT NOT NULL DEFAULT 0;
UPDATE time_entries SET worked_seconds = CASE WHEN clock_out IS NULL THEN 0 ELSE FLOOR(EXTRACT(EPOCH FROM clock_out-clock_in))::BIGINT END;
ALTER TABLE time_entries ADD CONSTRAINT ck_entry_times CHECK(clock_out IS NULL OR clock_out > clock_in);
ALTER TABLE time_entries ADD CONSTRAINT ck_entry_state CHECK((status='OPEN' AND clock_out IS NULL) OR (status<>'OPEN' AND clock_out IS NOT NULL));
CREATE UNIQUE INDEX uk_employee_open_entry ON time_entries(employee_id) WHERE status='OPEN';
CREATE UNIQUE INDEX uk_clock_request ON time_entries(request_id) WHERE request_id IS NOT NULL;
-- Serialize modifications per employee, including the first clock-in with no existing entry.
CREATE TABLE attendance_employee_locks(employee_id BIGINT PRIMARY KEY);
CREATE TABLE attendance_audits(
 id BIGSERIAL PRIMARY KEY, entry_id BIGINT NOT NULL REFERENCES time_entries(id),
 reviewer UUID NOT NULL, action VARCHAR(20) NOT NULL, reason VARCHAR(500) NOT NULL,
 old_clock_in TIMESTAMPTZ NOT NULL, old_clock_out TIMESTAMPTZ,
 new_clock_in TIMESTAMPTZ NOT NULL, new_clock_out TIMESTAMPTZ,
 old_status VARCHAR(30) NOT NULL, new_status VARCHAR(30) NOT NULL, occurred_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_attendance_audit_entry ON attendance_audits(entry_id);
