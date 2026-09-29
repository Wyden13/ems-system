package com.emssystem.emspayrollservice.payroll.exception;

public class PayrollAlreadyFinalizedException extends RuntimeException {
    public PayrollAlreadyFinalizedException(Long id) {
        super("Payroll is already finalized: " + id);
    }
}
