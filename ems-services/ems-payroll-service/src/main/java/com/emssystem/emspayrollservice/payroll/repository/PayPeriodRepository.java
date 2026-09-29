package com.emssystem.emspayrollservice.payroll.repository;

import com.emssystem.emspayrollservice.payroll.entity.PayPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface PayPeriodRepository extends JpaRepository<PayPeriod, Long> {
    List<PayPeriod> findByStartDateLessThanEqualAndEndDateGreaterThanEqual(LocalDate end, LocalDate start);
}
