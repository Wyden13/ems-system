package com.emssystem.emsattendanceservice.attendance.dto.response;

import java.time.LocalDate;
import java.util.List;

@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.ALWAYS)
public record TimesheetResponse(Long employeeId, LocalDate periodStart, LocalDate periodEnd,
        int workedMinutes, Integer overtimeMinutes, List<TimeEntryResponse> entries) {
    public TimesheetResponse {
        entries = List.copyOf(entries);
    }
}
