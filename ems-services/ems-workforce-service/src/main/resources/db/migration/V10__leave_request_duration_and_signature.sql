ALTER TABLE pto_requests ADD COLUMN request_unit VARCHAR(5) NOT NULL DEFAULT 'HOURS';
ALTER TABLE pto_requests ADD COLUMN requested_amount NUMERIC(10,2);
UPDATE pto_requests SET requested_amount = hours;
ALTER TABLE pto_requests ADD CONSTRAINT ck_request_unit CHECK (request_unit IN ('DAYS', 'HOURS'));
ALTER TABLE pto_requests ADD CONSTRAINT ck_requested_amount CHECK (requested_amount > 0);
ALTER TABLE pto_requests ADD COLUMN reason_category VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE pto_requests ADD COLUMN employee_signature VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE pto_requests ADD COLUMN signed_at TIMESTAMPTZ;
