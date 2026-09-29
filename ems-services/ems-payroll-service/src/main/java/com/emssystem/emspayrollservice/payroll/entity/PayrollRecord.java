package com.emssystem.emspayrollservice.payroll.entity;

import com.emssystem.emspayrollservice.payroll.enums.PayrollStatus;
import com.emssystem.emspayrollservice.shared.entity.AuditableEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "payroll_records", uniqueConstraints = @UniqueConstraint(name = "uk_payroll_period_employee", columnNames = {
        "pay_period_id", "employee_id" }), indexes = @Index(name = "idx_payroll_employee", columnList = "employee_id"))
public class PayrollRecord extends AuditableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pay_period_id", nullable = false)
    private PayPeriod payPeriod;
    @Column(name = "employee_id", nullable = false)
    private Long employeeId;
    @Column(name = "regular_hours", nullable = false, precision = 10, scale = 2)
    private BigDecimal regularHours;
    @Column(name = "overtime_hours", nullable = false, precision = 10, scale = 2)
    private BigDecimal overtimeHours;
    @Column(name = "gross_pay", nullable = false, precision = 19, scale = 2)
    private BigDecimal grossPay;
    @Column(name = "net_pay", nullable = false, precision = 19, scale = 2)
    private BigDecimal netPay;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PayrollStatus status = PayrollStatus.DRAFT;

    protected PayrollRecord() {
    }

    public PayrollRecord(PayPeriod period, Long employeeId, BigDecimal regularHours, BigDecimal overtimeHours,
            BigDecimal grossPay, BigDecimal netPay) {
        this.payPeriod = period;
        this.employeeId = employeeId;
        this.regularHours = regularHours;
        this.overtimeHours = overtimeHours;
        this.grossPay = grossPay;
        this.netPay = netPay;
    }

    public Long getId() {
        return id;
    }

    public PayPeriod getPayPeriod() {
        return payPeriod;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    public BigDecimal getRegularHours() {
        return regularHours;
    }

    public BigDecimal getOvertimeHours() {
        return overtimeHours;
    }

    public BigDecimal getGrossPay() {
        return grossPay;
    }

    public BigDecimal getNetPay() {
        return netPay;
    }

    public PayrollStatus getStatus() {
        return status;
    }
}
