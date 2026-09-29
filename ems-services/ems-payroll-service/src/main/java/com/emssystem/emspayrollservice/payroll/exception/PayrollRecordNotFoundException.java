package com.emssystem.emspayrollservice.payroll.exception;

public class PayrollRecordNotFoundException extends RuntimeException {
    public PayrollRecordNotFoundException(Long id) {
        super("Payroll record not found: " + id);
    }
}
