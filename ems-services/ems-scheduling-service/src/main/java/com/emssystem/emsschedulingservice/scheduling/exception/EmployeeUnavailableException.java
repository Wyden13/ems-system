package com.emssystem.emsschedulingservice.scheduling.exception;
public class EmployeeUnavailableException extends RuntimeException{
    public EmployeeUnavailableException(Long employeeId,Long shiftId){
        super("Employee "+employeeId+" is unavailable for shift "+shiftId);
    }}
