package com.emssystem.emsattendanceservice.attendance.scheduling;

import java.time.*;
import java.util.*;

public interface ScheduleProvider {
    record Shift(Instant start, Instant end, long unpaidBreakSeconds) {
    }

    // Empty optional means scheduling is unavailable, not that the employee has no
    // assigned shifts.
    Optional<List<Shift>> assignedShifts(long employeeId, Instant from, Instant to);
}
