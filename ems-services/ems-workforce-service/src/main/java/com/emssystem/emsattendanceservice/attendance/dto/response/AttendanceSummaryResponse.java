package com.emssystem.emsattendanceservice.attendance.dto.response;

@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.ALWAYS)
public record AttendanceSummaryResponse(long open, long pendingApproval, long approved, long rejected,
        int workedMinutes, Integer overtimeMinutes) {
}
