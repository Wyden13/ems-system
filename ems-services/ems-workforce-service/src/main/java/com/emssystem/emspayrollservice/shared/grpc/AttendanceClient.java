package com.emssystem.emspayrollservice.shared.grpc;

import com.emssystem.contracts.workforce.v1.AttendanceEntry;
import com.emssystem.emsattendanceservice.attendance.repository.TimeEntryRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;

/**
 * Internal attendance query shared by payroll; one query for the authorized
 * employee set.
 */
@Component
public class AttendanceClient {
    private final TimeEntryRepository entries;

    public AttendanceClient(TimeEntryRepository entries) {
        this.entries = entries;
    }

    @Transactional(readOnly = true)
    public Map<Long, List<AttendanceEntry>> entriesByEmployee(Collection<Long> employeeIds, Instant from, Instant to) {
        if (employeeIds.isEmpty())
            return Map.of();
        var grouped = new HashMap<Long, List<AttendanceEntry>>();
        for (var e : entries.overlappingEmployees(employeeIds, from, to)) {
            var row = AttendanceEntry.newBuilder().setId(e.getId()).setClockIn(e.getClockIn().getEpochSecond())
                    .setStatus(e.getStatus().name());
            if (e.getClockOut() != null)
                row.setClockOut(e.getClockOut().getEpochSecond());
            grouped.computeIfAbsent(e.getEmployeeId(), key -> new ArrayList<>()).add(row.build());
        }
        return grouped;
    }
}
