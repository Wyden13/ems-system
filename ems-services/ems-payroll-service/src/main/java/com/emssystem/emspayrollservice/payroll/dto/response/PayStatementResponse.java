package com.emssystem.emspayrollservice.payroll.dto.response;

import java.time.LocalDate;

public record PayStatementResponse(PayrollRecordResponse payroll, LocalDate periodStart, LocalDate periodEnd,
        LocalDate payDate) {
}
