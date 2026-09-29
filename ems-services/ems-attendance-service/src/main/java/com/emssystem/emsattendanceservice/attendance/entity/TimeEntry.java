package com.emssystem.emsattendanceservice.attendance.entity;
import com.emssystem.emsattendanceservice.attendance.enums.*;
import com.emssystem.emsattendanceservice.shared.entity.AuditableEntity;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="time_entries", indexes={
        @Index(name="idx_time_entry_employee_clock_in",columnList="employee_id,clock_in"),
        @Index(name="idx_time_entry_status_clock_in",columnList="status,clock_in")})
public class TimeEntry extends AuditableEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="employee_id",nullable=false) private Long employeeId;
    @Column(name="clock_in",nullable=false) private Instant clockIn;
    @Column(name="clock_out") private Instant clockOut;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=30) private ClockSource source;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=30) private TimeEntryStatus status=TimeEntryStatus.OPEN;
    @Column(name="worked_minutes",nullable=false) private int workedMinutes;
    @Column(name="overtime_minutes",nullable=false) private int overtimeMinutes;
    @Column(name="worked_seconds",nullable=false) private long workedSeconds;
    @Column(name="request_id") private java.util.UUID requestId;
    public long getWorkedSeconds(){return workedSeconds;}
    public java.util.UUID getRequestId(){return requestId;}
    public void identify(java.util.UUID requestId){this.requestId=requestId;}
    public void close(Instant end){correct(clockIn,end);}
    public void correct(Instant start,Instant end){
        if(!end.isAfter(start)) throw new IllegalArgumentException("Clock-out must follow clock-in");
        clockIn=start;clockOut=end;workedSeconds=java.time.Duration.between(start,end).getSeconds();
        workedMinutes=(int)(workedSeconds/60);overtimeMinutes=0;status=TimeEntryStatus.PENDING_APPROVAL;
    }
    public void review(boolean approved){status=approved?TimeEntryStatus.APPROVED:TimeEntryStatus.REJECTED;}
    protected TimeEntry(){}
    public TimeEntry(Long employeeId, Instant clockIn, ClockSource source){this.employeeId=employeeId;this.clockIn=clockIn;this.source=source;}
    public Long getId(){return id;} public Long getEmployeeId(){return employeeId;} public Instant getClockIn(){return clockIn;}
    public Instant getClockOut(){return clockOut;} public ClockSource getSource(){return source;} public TimeEntryStatus getStatus(){return status;}
    public int getWorkedMinutes(){return workedMinutes;} public int getOvertimeMinutes(){return overtimeMinutes;}
}
