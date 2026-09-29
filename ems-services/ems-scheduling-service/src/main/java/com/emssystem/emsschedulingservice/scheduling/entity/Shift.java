package com.emssystem.emsschedulingservice.scheduling.entity;
import com.emssystem.emsschedulingservice.scheduling.enums.ShiftStatus;
import com.emssystem.emsschedulingservice.shared.entity.AuditableEntity;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="shifts",indexes={@Index(name="idx_shift_location_start",columnList="location_id,starts_at"),@Index(name="idx_shift_status_start",columnList="status,starts_at")})
public class Shift extends AuditableEntity {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="shift_category_id",nullable=false) private ShiftCategory shiftCategory;
 @Column(name="starts_at",nullable=false) private Instant startsAt; @Column(name="ends_at",nullable=false) private Instant endsAt;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private ShiftStatus status=ShiftStatus.DRAFT;
 @Column(name="location_id",nullable=false) private Long locationId;
 @Column(name="required_employees",nullable=false) private int requiredEmployees;
 protected Shift(){} public Shift(ShiftCategory category,Instant startsAt,Instant endsAt,Long locationId,int requiredEmployees){this.shiftCategory=category;this.startsAt=startsAt;this.endsAt=endsAt;this.locationId=locationId;this.requiredEmployees=requiredEmployees;}
 public Long getId(){return id;} public ShiftCategory getShiftCategory(){return shiftCategory;} public Instant getStartsAt(){return startsAt;} public Instant getEndsAt(){return endsAt;}
 public ShiftStatus getStatus(){return status;} public Long getLocationId(){return locationId;} public int getRequiredEmployees(){return requiredEmployees;}
}
