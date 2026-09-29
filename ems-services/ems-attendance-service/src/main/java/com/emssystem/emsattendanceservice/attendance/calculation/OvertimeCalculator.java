package com.emssystem.emsattendanceservice.attendance.calculation;

public interface OvertimeCalculator {
    int calculateOvertimeMinutes(int workedMinutes, int regularMinuteLimit);
}
