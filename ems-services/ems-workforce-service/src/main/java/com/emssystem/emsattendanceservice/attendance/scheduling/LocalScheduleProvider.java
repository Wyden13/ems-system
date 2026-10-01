package com.emssystem.emsattendanceservice.attendance.scheduling;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.*;

@Component
public class LocalScheduleProvider implements ScheduleProvider {
    private final JdbcTemplate db;

    public LocalScheduleProvider(JdbcTemplate db) {
        this.db = db;
    }

    @Transactional(readOnly = true)
    public Optional<List<Shift>> assignedShifts(long employeeId, Instant from, Instant to) {
        return Optional.of(db.query(
                "select s.starts_at,s.ends_at from shifts s join shift_assignments a on a.shift_id=s.id where a.employee_id=? and a.status in ('ASSIGNED','ACCEPTED') and s.status='PUBLISHED' and s.starts_at<? and s.ends_at>? order by s.starts_at,s.id",
                (row, index) -> new Shift(row.getTimestamp("starts_at").toInstant(),
                        row.getTimestamp("ends_at").toInstant(), 0),
                employeeId, Timestamp.from(to), Timestamp.from(from)));
    }
}
