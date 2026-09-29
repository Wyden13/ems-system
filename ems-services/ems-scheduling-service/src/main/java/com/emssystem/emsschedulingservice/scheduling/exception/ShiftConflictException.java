package com.emssystem.emsschedulingservice.scheduling.exception;
public class ShiftConflictException extends RuntimeException{
    public ShiftConflictException(Long employeeId){
        super("Conflicting shift assignment for employee: "+employeeId);
    }
}
