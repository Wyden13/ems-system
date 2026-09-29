package com.emssystem.emsattendanceservice.attendance.exception;
public class AlreadyClockedInException extends RuntimeException { public AlreadyClockedInException(Long employeeId){super("Employee already has an open time entry: "+employeeId);} }
