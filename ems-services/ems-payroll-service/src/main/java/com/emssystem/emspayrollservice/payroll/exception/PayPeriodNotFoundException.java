package com.emssystem.emspayrollservice.payroll.exception;

public class PayPeriodNotFoundException extends RuntimeException {
    public PayPeriodNotFoundException(Long id) {
        super("Pay period not found: " + id);
    }
}
