package com.emssystem.emspayrollservice.payroll.dto.request;

import jakarta.validation.constraints.NotNull;

public record GeneratePayrollRequest(@NotNull Long payPeriodId) {
}
