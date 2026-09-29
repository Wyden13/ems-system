package com.emssystem.emspayrollservice.payroll.dto.response;

import com.emssystem.emspayrollservice.payroll.enums.PayPeriodStatus;
import java.time.*;

public record PayPeriodResponse(Long id, LocalDate startDate, LocalDate endDate, LocalDate payDate,
        PayPeriodStatus status, Instant createdAt, Instant updatedAt) {
}
