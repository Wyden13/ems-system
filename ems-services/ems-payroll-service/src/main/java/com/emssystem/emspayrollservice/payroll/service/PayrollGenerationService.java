package com.emssystem.emspayrollservice.payroll.service;

import com.emssystem.emspayrollservice.payroll.dto.request.GeneratePayrollRequest;
import com.emssystem.emspayrollservice.payroll.dto.response.PayrollSummaryResponse;

public interface PayrollGenerationService {
    PayrollSummaryResponse generate(GeneratePayrollRequest request);
}
