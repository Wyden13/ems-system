package com.emssystem.emsschedulingservice.scheduling.dto.response;
import java.time.Instant;
public record ShiftConflictResponse(Long shiftId,Long conflictingShiftId,Long employeeId,Instant startsAt,Instant endsAt,String reason) {}
