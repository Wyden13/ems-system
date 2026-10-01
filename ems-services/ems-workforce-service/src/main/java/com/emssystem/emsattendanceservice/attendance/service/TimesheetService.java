package com.emssystem.emsattendanceservice.attendance.service;

import com.emssystem.emsattendanceservice.attendance.dto.response.*;
import java.time.LocalDate;
import java.util.UUID;

public interface TimesheetService {
    TimesheetResponse getForAccount(UUID userAccountId, LocalDate from, LocalDate to);

    AttendanceSummaryResponse summary(LocalDate from, LocalDate to);
}
