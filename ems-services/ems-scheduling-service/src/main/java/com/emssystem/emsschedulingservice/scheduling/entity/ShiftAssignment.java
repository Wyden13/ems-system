package com.emssystem.emsschedulingservice.scheduling.entity;
import com.emssystem.emsschedulingservice.scheduling.enums.AssignmentStatus;
import com.emssystem.emsschedulingservice.shared.entity.AuditableEntity;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="shift_assignments",uniqueConstraints=@UniqueConstraint(name="uk_shift_employee",columnNames={"shift_id","employee_id"}),indexes=@Index(name="idx_assignment_employee",columnList="employee_id"))
public class ShiftAssignment extends AuditableEntity {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="shift_id",nullable=false) private Shift shift;
 @Column(name="employee_id",nullable=false) private Long employeeId;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private AssignmentStatus status=AssignmentStatus.ASSIGNED;
 @Column(name="responded_at") private Instant respondedAt;
 protected ShiftAssignment(){} public ShiftAssignment(Shift shift,Long employeeId){this.shift=shift;this.employeeId=employeeId;}
 public Long getId(){return id;} public Shift getShift(){return shift;} public Long getEmployeeId(){return employeeId;} public AssignmentStatus getStatus(){return status;} public Instant getRespondedAt(){return respondedAt;}
}
