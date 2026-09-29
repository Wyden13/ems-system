package com.emssystem.emsattendanceservice;
import com.emssystem.emsattendanceservice.attendance.entity.TimeEntry; import com.emssystem.emsattendanceservice.attendance.enums.*; import org.junit.jupiter.api.Test; import java.time.Instant; import static org.junit.jupiter.api.Assertions.*;
class EmsAttendanceServiceApplicationTests{@Test void initializesOpenTimeEntry(){TimeEntry entry=new TimeEntry(1L,Instant.EPOCH,ClockSource.WEB);assertEquals(TimeEntryStatus.OPEN,entry.getStatus());assertEquals(0,entry.getWorkedMinutes());}}
