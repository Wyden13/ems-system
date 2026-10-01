-- Keep V1 intact for existing installations. Conflicting legacy names must be
-- resolved before migrating; do not silently rename or remove organization data.
CREATE UNIQUE INDEX uk_location_name_ignore_case ON locations (lower(name));
CREATE UNIQUE INDEX uk_department_name_ignore_case ON departments (lower(department_name));
