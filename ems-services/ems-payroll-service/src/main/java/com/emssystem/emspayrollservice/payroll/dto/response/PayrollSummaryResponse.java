package com.emssystem.emspayrollservice.payroll.dto.response;

import java.math.BigDecimal;

public record PayrollSummaryResponse(Long payPeriodId, long recordCount, BigDecimal grossPay, BigDecimal deductions,
        BigDecimal netPay) {
}
