package com.emssystem.emspayrollservice.payroll.exception;

public class UnapprovedTimeEntriesException extends RuntimeException {
    public UnapprovedTimeEntriesException(Long payPeriodId) {
        super("Pay period has unapproved time entries: " + payPeriodId);
    }
}
