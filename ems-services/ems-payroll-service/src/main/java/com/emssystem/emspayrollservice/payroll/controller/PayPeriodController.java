package com.emssystem.emspayrollservice.payroll.controller;

import com.emssystem.emspayrollservice.payroll.dto.request.CreatePayPeriodRequest;
import com.emssystem.emspayrollservice.payroll.dto.response.PayPeriodResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RequestMapping("/api/pay-periods")
public interface PayPeriodController {
    @PostMapping
    PayPeriodResponse create(@Valid @RequestBody CreatePayPeriodRequest request);

    @GetMapping("/{id}")
    PayPeriodResponse get(@PathVariable Long id);

    @GetMapping
    List<PayPeriodResponse> list();
}
