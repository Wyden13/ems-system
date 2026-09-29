package com.emssystem.emspayrollservice.payroll.entity;

import com.emssystem.emspayrollservice.payroll.enums.PayPeriodStatus;
import com.emssystem.emspayrollservice.shared.entity.AuditableEntity;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "pay_periods", uniqueConstraints = @UniqueConstraint(name = "uk_pay_period_dates", columnNames = {
        "start_date", "end_date" }))
public class PayPeriod extends AuditableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PayPeriodStatus status = PayPeriodStatus.OPEN;
    @Column(name = "pay_date", nullable = false)
    private LocalDate payDate;

    protected PayPeriod() {
    }

    public PayPeriod(LocalDate start, LocalDate end, LocalDate payDate) {
        this.startDate = start;
        this.endDate = end;
        this.payDate = payDate;
    }

    public Long getId() {
        return id;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public PayPeriodStatus getStatus() {
        return status;
    }

    public LocalDate getPayDate() {
        return payDate;
    }
}
