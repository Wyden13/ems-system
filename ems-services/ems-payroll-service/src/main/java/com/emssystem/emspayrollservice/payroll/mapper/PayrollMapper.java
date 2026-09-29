package com.emssystem.emspayrollservice.payroll.mapper;

import com.emssystem.emspayrollservice.payroll.dto.response.*;
import com.emssystem.emspayrollservice.payroll.entity.*;
import java.util.List;

public final class PayrollMapper {
    private PayrollMapper() {
    }

    public static PayPeriodResponse toResponse(PayPeriod p) {
        return new PayPeriodResponse(p.getId(), p.getStartDate(), p.getEndDate(), p.getPayDate(), p.getStatus(),
                p.getCreatedAt(), p.getUpdatedAt());
    }

    public static PayrollRecordResponse toResponse(PayrollRecord r, List<PayrollEarning> e, List<PayrollDeduction> d) {
        return new PayrollRecordResponse(r.getId(), r.getPayPeriod().getId(), r.getEmployeeId(), r.getRegularHours(),
                r.getOvertimeHours(), r.getGrossPay(), r.getNetPay(), r.getStatus(),
                e.stream()
                        .map(x -> new PayrollLineItemResponse(x.getId(), x.getType().name(), x.getAmount(),
                                x.getDescription()))
                        .toList(),
                d.stream().map(x -> new PayrollLineItemResponse(x.getId(), x.getType().name(), x.getAmount(),
                        x.getDescription())).toList());
    }
}
