package com.emssystem.emspayrollservice.payroll.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CreatePayPeriodRequest(@NotNull LocalDate startDate, @NotNull LocalDate endDate,
        @NotNull LocalDate payDate) {
}
