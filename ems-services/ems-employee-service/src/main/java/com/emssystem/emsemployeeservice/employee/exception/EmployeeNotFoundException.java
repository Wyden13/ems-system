package com.emssystem.emsemployeeservice.employee.exception;

import java.util.UUID;

public class EmployeeNotFoundException extends RuntimeException {
    public EmployeeNotFoundException(){super("Employee not found");}
    public EmployeeNotFoundException(Long id) {
        super("Employee not found: " + id);
    }
    public EmployeeNotFoundException(String number){
        super(String.format("Employee with number %s not found", number));
    }
    public EmployeeNotFoundException(UUID userAccountId) {
        super("Employee linked to user account not found: " + userAccountId);
    }
}
