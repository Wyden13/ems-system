package com.emssystem.emsattendanceservice.attendance.dto.response;

import com.emssystem.emsattendanceservice.attendance.enums.*;
import java.time.Instant;

public record TimeEntryResponse(Long id, Long employeeId, Instant clockIn, Instant clockOut, ClockSource source,
        TimeEntryStatus status, int workedMinutes, int overtimeMinutes, long workedSeconds, long version,
        Instant createdAt, Instant updatedAt) {
}
