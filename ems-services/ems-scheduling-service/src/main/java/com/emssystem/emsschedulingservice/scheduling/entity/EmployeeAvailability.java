package com.emssystem.emsschedulingservice.scheduling.entity;
import com.emssystem.emsschedulingservice.scheduling.enums.AvailabilityType;
import com.emssystem.emsschedulingservice.shared.entity.AuditableEntity;
import jakarta.persistence.*;
import java.time.*;
@Entity @Table(name="employee_availability",indexes=@Index(name="idx_availability_employee_day",columnList="employee_id,day_of_week"))
public class EmployeeAvailability extends AuditableEntity {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @Column(name="employee_id",nullable=false) private Long employeeId;
 @Enumerated(EnumType.STRING) @Column(name="day_of_week",nullable=false,length=10) private DayOfWeek dayOfWeek;
 @Column(name="start_time",nullable=false) private LocalTime startTime; @Column(name="end_time",nullable=false) private LocalTime endTime;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private AvailabilityType type;
 protected EmployeeAvailability(){} public EmployeeAvailability(Long employeeId,DayOfWeek day,LocalTime start,LocalTime end,AvailabilityType type){this.employeeId=employeeId;this.dayOfWeek=day;this.startTime=start;this.endTime=end;this.type=type;}
 public Long getId(){return id;} public Long getEmployeeId(){return employeeId;} public DayOfWeek getDayOfWeek(){return dayOfWeek;}
 public LocalTime getStartTime(){return startTime;} public LocalTime getEndTime(){return endTime;} public AvailabilityType getType(){return type;}
}
