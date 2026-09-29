package com.emssystem.emspayrollservice.payroll.dto.request;

import jakarta.validation.constraints.NotNull;

public record FinalizePayrollRequest(@NotNull Long payPeriodId) {
}
