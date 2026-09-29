package com.emssystem.emsleaveservice.pto.dto.request; import jakarta.validation.constraints.*; import java.math.BigDecimal;
public record UpsertPtoTypeRequest(@NotBlank @Size(max=100) String name,@NotNull @DecimalMin("0.0000") @Digits(integer=6,fraction=4) BigDecimal accrualRatePerPeriod,@NotNull @DecimalMin("0.00") @Digits(integer=8,fraction=2) BigDecimal maxCarryover,boolean paid) {}
