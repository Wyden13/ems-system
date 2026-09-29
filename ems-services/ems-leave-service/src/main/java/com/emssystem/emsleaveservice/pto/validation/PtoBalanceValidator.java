package com.emssystem.emsleaveservice.pto.validation; import java.math.BigDecimal; public interface PtoBalanceValidator{void validate(Long employeeId,Long ptoTypeId,BigDecimal requestedHours);}
