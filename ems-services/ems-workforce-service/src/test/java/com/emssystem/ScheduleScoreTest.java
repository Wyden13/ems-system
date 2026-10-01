package com.emssystem;
import com.emssystem.emsattendanceservice.attendance.controller.TimesheetController;
import com.emssystem.emsattendanceservice.attendance.service.AttendanceOperations;
import com.emssystem.emsattendanceservice.attendance.scheduling.ScheduleProvider;
import com.emssystem.emsattendanceservice.attendance.dto.response.TimeEntryResponse;
import com.emssystem.emsattendanceservice.attendance.enums.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class ScheduleScoreTest {
    @Test void overnightPartialAttendanceCountsPresenceButRejectedAndFutureShiftsDoNot() {
        var attendance=mock(AttendanceOperations.class); var schedules=mock(ScheduleProvider.class);
        var now=Instant.parse("2026-10-03T12:00:00Z");
        var controller=new TimesheetController(attendance,schedules,Clock.fixed(now,ZoneOffset.UTC));
        var start=Instant.parse("2026-10-01T23:00:00Z");
        when(schedules.assignedShifts(eq(1L),any(),any())).thenReturn(Optional.of(List.of(
            new ScheduleProvider.Shift(start,start.plusSeconds(28800),0),
            new ScheduleProvider.Shift(start.plusSeconds(86400),start.plusSeconds(115200),0),
            new ScheduleProvider.Shift(now.plusSeconds(3600),now.plusSeconds(7200),0))));
        when(attendance.list(eq(1L),isNull(),any(),any())).thenReturn(List.of(
            new TimeEntryResponse(1L,1L,start.plusSeconds(3600),start.plusSeconds(7200),ClockSource.WEB,TimeEntryStatus.APPROVED,60,0,3600,0,null,null),
            new TimeEntryResponse(2L,1L,start.plusSeconds(86400),start.plusSeconds(115200),ClockSource.WEB,TimeEntryStatus.REJECTED,480,0,28800,0,null,null)));
        var score=controller.score(1L,LocalDate.of(2026,10,1),LocalDate.of(2026,10,3));
        assertEquals(2L,score.expectedEvents());assertEquals(1L,score.missedEvents());assertEquals(50.0,score.missPercentage());
        verify(attendance).canRead(1L);
    }
}
