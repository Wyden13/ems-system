package com.emssystem.emsemployeeservice.employee.exception;

public class EmployeeEmailAlreadyExistsException extends RuntimeException {
    public EmployeeEmailAlreadyExistsException(String email) {
        super("Employee email already exists: " + email);
    }
}
