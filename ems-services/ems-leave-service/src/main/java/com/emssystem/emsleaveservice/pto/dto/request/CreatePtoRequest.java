package com.emssystem.emsleaveservice.pto.dto.request; import jakarta.validation.constraints.*; import java.math.BigDecimal; import java.time.LocalDate;
public record CreatePtoRequest(@NotNull Long ptoTypeId,@NotNull LocalDate startDate,@NotNull LocalDate endDate,@NotNull @DecimalMin("0.25") @Digits(integer=8,fraction=2) BigDecimal hours) {}
