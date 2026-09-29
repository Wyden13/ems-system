package com.emssystem.emspayrollservice.payroll.dto.request;

import com.emssystem.emspayrollservice.payroll.enums.EarningType;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record AddEarningRequest(@NotNull EarningType type,
        @NotNull @DecimalMin("0.00") @Digits(integer = 17, fraction = 2) BigDecimal amount,
        @Size(max = 250) String description) {
}
