package com.emssystem.emspayrollservice.payroll.service;

import com.emssystem.emspayrollservice.payroll.dto.request.CreatePayPeriodRequest;
import com.emssystem.emspayrollservice.payroll.dto.response.PayPeriodResponse;
import java.util.List;

public interface PayPeriodService {
    PayPeriodResponse create(CreatePayPeriodRequest request);

    PayPeriodResponse get(Long id);

    List<PayPeriodResponse> list();
}
