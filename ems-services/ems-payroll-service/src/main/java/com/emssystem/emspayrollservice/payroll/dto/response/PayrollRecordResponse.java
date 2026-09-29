package com.emssystem.emspayrollservice.payroll.dto.response;

import com.emssystem.emspayrollservice.payroll.enums.PayrollStatus;
import java.math.BigDecimal;
import java.util.List;

public record PayrollRecordResponse(Long id, Long payPeriodId, Long employeeId, BigDecimal regularHours,
        BigDecimal overtimeHours, BigDecimal grossPay, BigDecimal netPay, PayrollStatus status,
        List<PayrollLineItemResponse> earnings, List<PayrollLineItemResponse> deductions) {
    public PayrollRecordResponse {
        earnings = List.copyOf(earnings);
        deductions = List.copyOf(deductions);
    }
}
