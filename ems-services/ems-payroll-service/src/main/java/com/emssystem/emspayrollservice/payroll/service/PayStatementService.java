package com.emssystem.emspayrollservice.payroll.service;

import com.emssystem.emspayrollservice.payroll.dto.response.PayStatementResponse;
import java.util.*;

public interface PayStatementService {
    List<PayStatementResponse> mine(UUID accountId);

    PayStatementResponse get(UUID accountId, Long recordId);
}
