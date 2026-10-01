package com.emssystem.emsattendanceservice.attendance.mapper;

import com.emssystem.emsattendanceservice.attendance.dto.response.TimeEntryResponse;
import com.emssystem.emsattendanceservice.attendance.entity.TimeEntry;

public final class TimeEntryMapper {
    private TimeEntryMapper() {
    }

    public static TimeEntryResponse toResponse(TimeEntry e) {
        return new TimeEntryResponse(e.getId(), e.getEmployeeId(), e.getClockIn(), e.getClockOut(), e.getSource(),
                e.getStatus(), e.getWorkedMinutes(), e.getOvertimeMinutes(), e.getWorkedSeconds(), e.getVersion(),
                e.getCreatedAt(), e.getUpdatedAt());
    }
}
