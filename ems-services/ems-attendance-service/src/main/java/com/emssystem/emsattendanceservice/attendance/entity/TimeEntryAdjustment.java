package com.emssystem.emsattendanceservice.attendance.entity;
import com.emssystem.emsattendanceservice.shared.entity.AuditableEntity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="time_entry_adjustments",indexes=@Index(name="idx_adjustment_time_entry",columnList="time_entry_id"))
public class TimeEntryAdjustment extends AuditableEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="time_entry_id",nullable=false) private TimeEntry timeEntry;
    @Column(name="adjusted_by",nullable=false) private UUID adjustedBy;
    @Column(name="original_clock_in",nullable=false) private Instant originalClockIn;
    @Column(name="original_clock_out") private Instant originalClockOut;
    @Column(nullable=false,length=500) private String reason;
    @Column(name="adjusted_at",nullable=false) private Instant adjustedAt;
    protected TimeEntryAdjustment(){}
    public TimeEntryAdjustment(TimeEntry timeEntry,UUID adjustedBy,Instant originalClockIn,Instant originalClockOut,String reason,Instant adjustedAt){
        this.timeEntry=timeEntry;this.adjustedBy=adjustedBy;this.originalClockIn=originalClockIn;this.originalClockOut=originalClockOut;this.reason=reason;this.adjustedAt=adjustedAt;}
    public Long getId(){return id;} public TimeEntry getTimeEntry(){return timeEntry;} public UUID getAdjustedBy(){return adjustedBy;}
    public Instant getOriginalClockIn(){return originalClockIn;} public Instant getOriginalClockOut(){return originalClockOut;}
    public String getReason(){return reason;} public Instant getAdjustedAt(){return adjustedAt;}
}
