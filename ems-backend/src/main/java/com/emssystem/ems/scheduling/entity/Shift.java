package com.emssystem.ems.scheduling.entity;

import com.emssystem.ems.employee.entity.Employee;
import com.emssystem.ems.scheduling.enums.ShiftStatus;
import jakarta.persistence.*;
import org.jetbrains.annotations.NotNull;

import java.time.Instant;

@Entity
@Table(
        name = "shifts",
        indexes = {
                @Index(name = "idx_shift_location_start", columnList = "location_id, starts_at"),
                @Index(name = "idx_shift_status_start", columnList = "status, starts_at")
        }
)
public class Shift {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shift_category_id", nullable = false)
    private ShiftCategory shiftCategory;


    @NotNull
    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @NotNull
    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(name="status",nullable = false)
    private ShiftStatus status;

    @Column(name="required_employees")
    private Employee[] required_employees;

}
