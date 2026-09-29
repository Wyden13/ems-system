package com.emssystem.emspayrollservice.payroll.controller;

import com.emssystem.emspayrollservice.payroll.dto.request.*;
import com.emssystem.emspayrollservice.payroll.dto.response.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RequestMapping("/api/payroll")
public interface PayrollController {
    @PostMapping("/generate")
    PayrollSummaryResponse generate(@Valid @RequestBody GeneratePayrollRequest request);

    @PostMapping("/finalize")
    PayrollSummaryResponse finalizePayroll(@Valid @RequestBody FinalizePayrollRequest request);

    @GetMapping("/records/{id}")
    PayrollRecordResponse get(@PathVariable Long id);

    @GetMapping("/records")
    List<PayrollRecordResponse> list(@RequestParam(required = false) Long payPeriodId,
            @RequestParam(required = false) Long employeeId);

    @PostMapping("/records/{id}/earnings")
    PayrollRecordResponse addEarning(@PathVariable Long id, @Valid @RequestBody AddEarningRequest request);

    @PostMapping("/records/{id}/deductions")
    PayrollRecordResponse addDeduction(@PathVariable Long id, @Valid @RequestBody AddDeductionRequest request);

    @GetMapping("/statements/me")
    List<PayStatementResponse> mine(@RequestHeader("X-User-Id") UUID userId);

    @GetMapping("/statements/{id}")
    PayStatementResponse statement(@RequestHeader("X-User-Id") UUID userId, @PathVariable Long id);
}
