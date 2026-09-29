package com.emssystem.emsattendanceservice.attendance.controller;
import com.emssystem.emsattendanceservice.attendance.dto.request.*;
import com.emssystem.emsattendanceservice.attendance.dto.response.*;
import com.emssystem.emsattendanceservice.attendance.enums.*;
import com.emssystem.emsattendanceservice.attendance.service.AttendanceOperations;
import com.emssystem.emsattendanceservice.shared.security.Caller;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.util.*;
@RestController @RequestMapping("/api/time-entries")
public class TimeEntryController {
 private final AttendanceOperations service;
 private final Clock clock;
 public TimeEntryController(AttendanceOperations service,Clock clock){this.service=service;this.clock=clock;}
 @GetMapping("/people") public Object people(){return service.people();}
 public record State(Instant serverTime,TimeEntryResponse active,long employeeId,long todaySeconds){}
 @GetMapping("/state") public State state(){return new State(clock.instant(),service.active(),service.mine().getEmployeeId(),service.todaySeconds());}
 @PostMapping("/clock-in") public TimeEntryResponse clockIn(@Valid @RequestBody ClockInRequest r){return service.clockIn(Caller.current().accountId(),r);}
 @PostMapping("/clock-out") public TimeEntryResponse clockOut(@Valid @RequestBody ClockOutRequest r){return service.clockOut(Caller.current().accountId(),r);}
 @GetMapping public List<TimeEntryResponse> list(@RequestParam(required=false) Long employeeId,@RequestParam(required=false) TimeEntryStatus status,@RequestParam Instant from,@RequestParam Instant to){return service.list(employeeId,status,from,to);}
 @GetMapping("/{id}") public TimeEntryResponse get(@PathVariable Long id){return service.get(id);}
 @GetMapping("/{id}/history") public Object history(@PathVariable Long id){return service.history(id);}
 @PostMapping("/{id}/approve") public TimeEntryResponse approve(@PathVariable Long id,@Valid @RequestBody ApproveTimeEntryRequest r){return service.approve(id,Caller.current().accountId(),r);}
 @PostMapping("/{id}/reject") public TimeEntryResponse reject(@PathVariable Long id,@Valid @RequestBody ApproveTimeEntryRequest r){return service.reject(id,Caller.current().accountId(),r);}
 @PostMapping("/{id}/adjust") public TimeEntryResponse adjust(@PathVariable Long id,@Valid @RequestBody AdjustTimeEntryRequest r){return service.adjust(id,Caller.current().accountId(),r);}
}
