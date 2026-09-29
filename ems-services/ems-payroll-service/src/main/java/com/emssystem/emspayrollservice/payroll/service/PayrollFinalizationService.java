package com.emssystem.emspayrollservice.payroll.service;

import com.emssystem.emspayrollservice.payroll.dto.request.FinalizePayrollRequest;
import com.emssystem.emspayrollservice.payroll.dto.response.PayrollSummaryResponse;

public interface PayrollFinalizationService {
    PayrollSummaryResponse finalizePayroll(FinalizePayrollRequest request);
}
