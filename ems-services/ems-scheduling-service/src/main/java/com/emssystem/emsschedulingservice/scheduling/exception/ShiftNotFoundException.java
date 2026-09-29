package com.emssystem.emsschedulingservice.scheduling.exception;
public class ShiftNotFoundException extends RuntimeException{
    public ShiftNotFoundException(Long id){
        super("Shift not found: "+id);
    }
}
