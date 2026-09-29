package com.emssystem.emsattendanceservice.attendance.controller;
import com.emssystem.emsattendanceservice.attendance.service.AttendanceOperations;
import com.emssystem.emsattendanceservice.attendance.scheduling.ScheduleProvider;
import com.emssystem.emsattendanceservice.shared.security.Caller;
import org.springframework.web.bind.annotation.*;
import java.time.*;
@RestController @RequestMapping("/api/timesheets")
public class TimesheetController {
 private final AttendanceOperations service;
 private final ScheduleProvider schedules;
 public TimesheetController(AttendanceOperations service,ScheduleProvider schedules){this.service=service;this.schedules=schedules;}
 @GetMapping("/me") public Object mine(@RequestParam LocalDate from,@RequestParam LocalDate to){return service.getForAccount(Caller.current().accountId(),from,to);}
 @GetMapping("/summary") public Object summary(@RequestParam LocalDate from,@RequestParam LocalDate to){return service.summary(from,to);}
 @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.ALWAYS)
 public record Score(String status,Long expectedEvents,Long missedEvents,Double missPercentage,String explanation){}
 @GetMapping("/score") public Score score(@RequestParam Long employeeId,@RequestParam LocalDate from,@RequestParam LocalDate to){
  service.canRead(employeeId);
  schedules.assignedShifts(employeeId,from.atStartOfDay(AttendanceOperations.ZONE).toInstant(),to.plusDays(1).atStartOfDay(AttendanceOperations.ZONE).toInstant());
  return new Score("UNAVAILABLE",null,null,null,"Schedule-based attendance scoring is not enabled yet.");
 }
}
