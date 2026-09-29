package com.emssystem.emspayrollservice.payroll.calculation;

import java.math.BigDecimal;
import java.util.List;

public interface GrossPayCalculator {
    BigDecimal calculate(List<BigDecimal> earnings);
}
