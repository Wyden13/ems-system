-- Normalize existing records in creation order without changing their IDs or links.
-- Flyway runs this migration transactionally; no duplicate intermediate numbers escape.
ALTER TABLE employees DROP CONSTRAINT uk_employee_number;
WITH ordered AS (
    SELECT id, row_number() OVER (ORDER BY created_at, id) AS number
    FROM employees
)
UPDATE employees e
SET employee_number = CASE WHEN ordered.number <= 999999
    THEN lpad(ordered.number::text, 6, '0') ELSE ordered.number::text END
FROM ordered WHERE e.id = ordered.id;
ALTER TABLE employees ADD CONSTRAINT uk_employee_number UNIQUE (employee_number);
ALTER TABLE employees ADD CONSTRAINT ck_employee_number_format
    CHECK (employee_number ~ '^[0-9]{6}$' AND employee_number <> '000000');

CREATE TABLE employee_number_counter (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_number BIGINT NOT NULL CHECK (last_number BETWEEN 0 AND 999999)
);
INSERT INTO employee_number_counter (id, last_number)
SELECT 1, count(*) FROM employees;
