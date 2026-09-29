package com.emssystem.emsattendanceservice.attendance.service;
import com.emssystem.emsattendanceservice.attendance.dto.response.TimeEntryResponse;
import com.emssystem.emsattendanceservice.attendance.enums.TimeEntryStatus;
import java.time.Instant;
import java.util.List;
public interface TimeEntryService { TimeEntryResponse get(Long id); List<TimeEntryResponse> list(Long employeeId,TimeEntryStatus status,Instant from,Instant to); }
