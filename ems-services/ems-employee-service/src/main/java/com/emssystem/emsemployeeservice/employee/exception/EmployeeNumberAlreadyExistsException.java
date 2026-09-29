package com.emssystem.emsemployeeservice.employee.exception;

public class EmployeeNumberAlreadyExistsException extends RuntimeException {
    public EmployeeNumberAlreadyExistsException(){
        super("Employee number already exists");
    }
    public EmployeeNumberAlreadyExistsException(String employeeNumber) {
        super("Employee number already exists: " + employeeNumber);
    }
}
