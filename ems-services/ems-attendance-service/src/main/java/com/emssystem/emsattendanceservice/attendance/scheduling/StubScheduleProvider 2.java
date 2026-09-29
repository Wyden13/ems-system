package com.emssystem.emsattendanceservice.attendance.scheduling;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Component;
@Component
public class StubScheduleProvider implements ScheduleProvider {
 public Optional<List<Shift>> assignedShifts(long employeeId,Instant from,Instant to){return Optional.empty();}
}
