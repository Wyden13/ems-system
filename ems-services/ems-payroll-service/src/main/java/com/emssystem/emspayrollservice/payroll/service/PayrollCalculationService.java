package com.emssystem.emspayrollservice.payroll.service;

import com.emssystem.emspayrollservice.payroll.dto.request.*;
import com.emssystem.emspayrollservice.payroll.dto.response.PayrollRecordResponse;
import java.util.List;

public interface PayrollCalculationService {
    PayrollRecordResponse get(Long id);

    List<PayrollRecordResponse> list(Long payPeriodId, Long employeeId);

    PayrollRecordResponse addEarning(Long recordId, AddEarningRequest request);

    PayrollRecordResponse addDeduction(Long recordId, AddDeductionRequest request);
}
