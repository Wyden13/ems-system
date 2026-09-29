package com.emssystem.emspayrollservice.payroll.dto.response;

import java.math.BigDecimal;

public record PayrollLineItemResponse(Long id, String type, BigDecimal amount, String description) {
}
