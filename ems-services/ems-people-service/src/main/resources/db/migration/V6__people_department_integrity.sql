ALTER TABLE employees ADD CONSTRAINT fk_employee_department FOREIGN KEY(department_id) REFERENCES departments(id);
