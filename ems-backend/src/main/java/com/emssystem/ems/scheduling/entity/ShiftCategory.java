package com.emssystem.ems.scheduling.entity;

import jakarta.persistence.*;

import java.time.LocalTime;

@Entity
@Table(
        name = "shift_categories",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_shift_category_name",
                        columnNames = "name"
                )
        }
)
public class ShiftCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "shift_category_id")
    private Long id;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

//    @Pattern(
//            regexp = "^#[0-9A-Fa-f]{6}$",
//            message = "Color must use the format #RRGGBB"
//    )
    @Column(name = "color", length = 7)
    private String color;

    @Column(name = "default_start_time", nullable = false)
    private LocalTime defaultStartTime;

    @Column(name = "default_end_time", nullable = false)
    private LocalTime defaultEndTime;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    protected ShiftCategory() {
    }

    public ShiftCategory(
            String name,
            String color,
            LocalTime defaultStartTime,
            LocalTime defaultEndTime
    ) {
        this.name = name;
        this.color = color;
        this.defaultStartTime = defaultStartTime;
        this.defaultEndTime = defaultEndTime;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getColor() {
        return color;
    }

    public LocalTime getDefaultStartTime() {
        return defaultStartTime;
    }

    public LocalTime getDefaultEndTime() {
        return defaultEndTime;
    }

    public boolean isActive() {
        return active;
    }

    public void updateDetails(
            String name,
            String color,
            LocalTime defaultStartTime,
            LocalTime defaultEndTime
    ) {
        this.name = name;
        this.color = color;
        this.defaultStartTime = defaultStartTime;
        this.defaultEndTime = defaultEndTime;
    }

    public void activate() {
        this.active = true;
    }

    public void deactivate() {
        this.active = false;
    }
}