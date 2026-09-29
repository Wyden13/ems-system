package com.emssystem.emspayrollservice.payroll.calculation;

import java.math.BigDecimal;

public interface RegularPayCalculator {
    BigDecimal calculate(BigDecimal hours, BigDecimal hourlyRate);
}
