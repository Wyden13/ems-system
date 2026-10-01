package com.emssystem.emsemployeeservice.employee.exception;

import java.util.UUID;

public class UserAccountAlreadyLinkedException extends RuntimeException {
    public UserAccountAlreadyLinkedException(UUID userAccountId) {
        super("User account is already linked to an employee: " + userAccountId);
    }
}
