package com.emssystem.emsschedulingservice.scheduling.entity;
import com.emssystem.emsschedulingservice.shared.entity.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalTime;
@Entity @Table(name="shift_categories",uniqueConstraints=@UniqueConstraint(name="uk_shift_category_name",columnNames="name"))
public class ShiftCategory extends AuditableEntity {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,length=50) private String name; @Column(length=7) private String color;
 @Column(name="default_start_time",nullable=false) private LocalTime defaultStartTime;
 @Column(name="default_end_time",nullable=false) private LocalTime defaultEndTime;
 @Column(nullable=false) private boolean active=true;
 protected ShiftCategory(){} public ShiftCategory(String name,String color,LocalTime start,LocalTime end){this.name=name;this.color=color;this.defaultStartTime=start;this.defaultEndTime=end;}
 public Long getId(){return id;} public String getName(){return name;} public String getColor(){return color;}
 public LocalTime getDefaultStartTime(){return defaultStartTime;} public LocalTime getDefaultEndTime(){return defaultEndTime;} public boolean isActive(){return active;}
}
