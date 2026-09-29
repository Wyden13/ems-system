package com.emssystem.emspayrollservice.payroll.entity;

import com.emssystem.emspayrollservice.payroll.enums.DeductionType;
import com.emssystem.emspayrollservice.shared.entity.AuditableEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "payroll_deductions", indexes = @Index(name = "idx_deduction_record", columnList = "payroll_record_id"))
public class PayrollDeduction extends AuditableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payroll_record_id", nullable = false)
    private PayrollRecord payrollRecord;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DeductionType type;
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;
    @Column(length = 250)
    private String description;

    protected PayrollDeduction() {
    }

    public PayrollDeduction(PayrollRecord record, DeductionType type, BigDecimal amount, String description) {
        this.payrollRecord = record;
        this.type = type;
        this.amount = amount;
        this.description = description;
    }

    public Long getId() {
        return id;
    }

    public PayrollRecord getPayrollRecord() {
        return payrollRecord;
    }

    public DeductionType getType() {
        return type;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getDescription() {
        return description;
    }
}
