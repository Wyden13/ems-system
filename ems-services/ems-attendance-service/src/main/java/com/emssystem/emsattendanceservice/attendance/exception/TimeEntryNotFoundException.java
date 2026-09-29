package com.emssystem.emsattendanceservice.attendance.exception;
public class TimeEntryNotFoundException extends RuntimeException { public TimeEntryNotFoundException(Long id){super("Time entry not found: "+id);} }
