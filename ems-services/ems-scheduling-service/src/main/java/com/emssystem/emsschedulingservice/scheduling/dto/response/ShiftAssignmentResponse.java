package com.emssystem.emsschedulingservice.scheduling.dto.response;
import com.emssystem.emsschedulingservice.scheduling.enums.AssignmentStatus;
import java.time.Instant;
public record ShiftAssignmentResponse(Long id,Long shiftId,Long employeeId,AssignmentStatus status,Instant respondedAt) {}
