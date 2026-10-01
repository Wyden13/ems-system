-- Existing shifts retain their identity and must be assigned a department before publishing.
ALTER TABLE shifts ADD COLUMN department_id BIGINT;
CREATE TABLE scheduling_lock (id INTEGER PRIMARY KEY);
INSERT INTO scheduling_lock VALUES (1);
CREATE TABLE leave_holds (request_id BIGINT PRIMARY KEY, employee_id BIGINT NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, CHECK(end_date>=start_date));
CREATE INDEX idx_leave_hold_employee_dates ON leave_holds(employee_id,start_date,end_date);
ALTER TABLE shifts ADD CONSTRAINT ck_shift_time CHECK(ends_at>starts_at);
ALTER TABLE shifts ADD CONSTRAINT ck_shift_capacity CHECK(required_employees>0);
ALTER TABLE employee_availability ADD CONSTRAINT ck_availability_time CHECK(end_time>start_time);
CREATE UNIQUE INDEX uk_category_normalized_name ON shift_categories(lower(name));
