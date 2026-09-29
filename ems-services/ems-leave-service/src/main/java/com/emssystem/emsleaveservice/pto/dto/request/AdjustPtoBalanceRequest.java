package com.emssystem.emsleaveservice.pto.dto.request; import jakarta.validation.constraints.*; import java.math.BigDecimal;
public record AdjustPtoBalanceRequest(@NotNull Long employeeId,@NotNull Long ptoTypeId,@NotNull @Digits(integer=8,fraction=2) BigDecimal hoursDelta,@NotBlank @Size(max=500) String reason) {}
