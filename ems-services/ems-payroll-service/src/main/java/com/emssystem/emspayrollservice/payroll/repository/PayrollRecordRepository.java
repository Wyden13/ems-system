package com.emssystem.emspayrollservice.payroll.repository;

import com.emssystem.emspayrollservice.payroll.entity.PayrollRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface PayrollRecordRepository extends JpaRepository<PayrollRecord, Long> {
    List<PayrollRecord> findByPayPeriodId(Long id);

    Optional<PayrollRecord> findByPayPeriodIdAndEmployeeId(Long periodId, Long employeeId);

    List<PayrollRecord> findByEmployeeId(Long employeeId);
}
