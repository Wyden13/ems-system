package com.emssystem.emsattendanceservice.attendance.controller;

import com.emssystem.emsattendanceservice.attendance.service.AttendanceOperations;
import com.emssystem.emsattendanceservice.attendance.scheduling.ScheduleProvider;
import com.emssystem.emsattendanceservice.shared.security.Caller;
import org.springframework.web.bind.annotation.*;
import java.time.*;

@RestController
@RequestMapping("/api/timesheets")
public class TimesheetController {
  private final AttendanceOperations service;
  private final ScheduleProvider schedules;
  private final Clock clock;

  public TimesheetController(AttendanceOperations service, ScheduleProvider schedules, Clock clock) {
    this.service = service;
    this.schedules = schedules;
    this.clock = clock;
  }

  @GetMapping("/me")
  public Object mine(@RequestParam LocalDate from, @RequestParam LocalDate to) {
    return service.getForAccount(Caller.current().accountId(), from, to);
  }

  @GetMapping("/summary")
  public Object summary(@RequestParam LocalDate from, @RequestParam LocalDate to) {
    return service.summary(from, to);
  }

  @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.ALWAYS)
  public record Score(String status, Long expectedEvents, Long missedEvents, Double missPercentage,
      String explanation) {
  }

  @GetMapping("/score")
  public Score score(@RequestParam Long employeeId, @RequestParam LocalDate from, @RequestParam LocalDate to) {
    service.canRead(employeeId);
    Instant start = from.atStartOfDay(AttendanceOperations.ZONE).toInstant();
    Instant end = to.plusDays(1).atStartOfDay(AttendanceOperations.ZONE).toInstant();
    var attendance = service.list(employeeId, null, start, end);
    var shifts = schedules.assignedShifts(employeeId, start, end);
    if (shifts.isEmpty())
      return new Score("UNAVAILABLE", null, null, null, "Schedule data is temporarily unavailable.");
    var completed = shifts.get().stream().filter(shift -> !shift.end().isAfter(clock.instant())).toList();
    long missed = completed.stream()
        .filter(shift -> attendance.stream().noneMatch(
            entry -> entry.status() != com.emssystem.emsattendanceservice.attendance.enums.TimeEntryStatus.REJECTED &&
                entry.clockIn().isBefore(shift.end()) &&
                (entry.clockOut() == null ? clock.instant() : entry.clockOut()).isAfter(shift.start())))
        .count();
    return new Score("AVAILABLE", (long) completed.size(), missed,
        completed.isEmpty() ? 0.0 : 100.0 * missed / completed.size(),
        "Completed published shifts with no overlapping attendance; future shifts and cancelled assignments are excluded.");
  }
}
