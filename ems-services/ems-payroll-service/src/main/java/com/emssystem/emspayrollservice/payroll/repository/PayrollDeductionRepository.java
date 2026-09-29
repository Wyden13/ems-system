package com.emssystem.emspayrollservice.payroll.repository;

import com.emssystem.emspayrollservice.payroll.entity.PayrollDeduction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PayrollDeductionRepository extends JpaRepository<PayrollDeduction, Long> {
    List<PayrollDeduction> findByPayrollRecordId(Long id);
}
