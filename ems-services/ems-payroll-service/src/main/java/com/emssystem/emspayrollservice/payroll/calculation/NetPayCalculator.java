package com.emssystem.emspayrollservice.payroll.calculation;

import java.math.BigDecimal;
import java.util.List;

public interface NetPayCalculator {
    BigDecimal calculate(BigDecimal grossPay, List<BigDecimal> deductions);
}
