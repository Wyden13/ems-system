package com.emssystem.emspayrollservice.payroll.repository;

import com.emssystem.emspayrollservice.payroll.entity.PayrollEarning;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PayrollEarningRepository extends JpaRepository<PayrollEarning, Long> {
    List<PayrollEarning> findByPayrollRecordId(Long id);
}
