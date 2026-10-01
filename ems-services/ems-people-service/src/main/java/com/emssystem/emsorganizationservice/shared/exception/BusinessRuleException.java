package com.emssystem.emsorganizationservice.shared.exception;

public class BusinessRuleException extends RuntimeException {
    private final ErrorCode code;

    public BusinessRuleException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode getCode() {
        return code;
    }
}
