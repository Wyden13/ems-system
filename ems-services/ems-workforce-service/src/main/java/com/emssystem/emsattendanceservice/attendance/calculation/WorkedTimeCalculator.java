package com.emssystem.emsattendanceservice.attendance.calculation;

import java.time.Instant;

public interface WorkedTimeCalculator {
    int calculateMinutes(Instant clockIn, Instant clockOut);
}
