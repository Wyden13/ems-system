package com.emssystem.emsattendanceservice.attendance.repository;
import com.emssystem.emsattendanceservice.attendance.entity.TimeEntry;
import com.emssystem.emsattendanceservice.attendance.enums.TimeEntryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.*;
public interface TimeEntryRepository extends JpaRepository<TimeEntry,Long>{
    Optional<TimeEntry> findByRequestId(java.util.UUID requestId);
    @org.springframework.data.jpa.repository.Query("select e from TimeEntry e where e.employeeId=:employeeId and e.clockIn < :to and (e.clockOut is null or e.clockOut > :from) order by e.clockIn")
    List<TimeEntry> overlapping(@org.springframework.data.repository.query.Param("employeeId") Long employeeId,@org.springframework.data.repository.query.Param("from") Instant from,@org.springframework.data.repository.query.Param("to") Instant to);
    Optional<TimeEntry> findFirstByEmployeeIdAndStatus(Long employeeId,TimeEntryStatus status);
    List<TimeEntry> findByEmployeeIdAndClockInBetween(Long employeeId,Instant from,Instant to);
    List<TimeEntry> findByStatusAndClockInBetween(TimeEntryStatus status,Instant from,Instant to);
}
