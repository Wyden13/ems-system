package com.emssystem.emspayrollservice.payroll.calculation;

import java.math.BigDecimal;

public interface OvertimePayCalculator {
    BigDecimal calculate(BigDecimal hours, BigDecimal hourlyRate, BigDecimal multiplier);
}
