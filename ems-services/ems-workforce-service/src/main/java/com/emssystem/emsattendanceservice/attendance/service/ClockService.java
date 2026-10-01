package com.emssystem.emsattendanceservice.attendance.service;

import com.emssystem.emsattendanceservice.attendance.dto.request.*;
import com.emssystem.emsattendanceservice.attendance.dto.response.TimeEntryResponse;
import java.util.UUID;

public interface ClockService {
    TimeEntryResponse clockIn(UUID userAccountId, ClockInRequest request);

    TimeEntryResponse clockOut(UUID userAccountId, ClockOutRequest request);
}
