package com.emssystem.emspayrollservice.payroll.service;

import com.emssystem.emspayrollservice.payroll.calculation.AttendancePayCalculator;
import com.emssystem.emspayrollservice.shared.grpc.*;
import com.emssystem.emsschedulingservice.shared.grpc.WorkforceClient;
import com.emssystem.emspayrollservice.shared.security.Caller;
import com.emssystem.contracts.workforce.v1.EmployeeInfo;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import static com.emssystem.emspayrollservice.payroll.calculation.AttendancePayCalculator.*;

@Service
public class PayrollEstimateService {
    private final WorkforceClient workforce;
    private final AttendanceClient attendance;
    private final AttendancePayCalculator calculator;
    private final Clock clock;

    public PayrollEstimateService(WorkforceClient workforce, AttendanceClient attendance,
            AttendancePayCalculator calculator, Clock clock) {
        this.workforce = workforce;
        this.attendance = attendance;
        this.calculator = calculator;
        this.clock = clock;
    }

    public record Estimate(long employeeId, String employeeName, String employeeNumber, BigDecimal hourlyRate,
            long approvedSeconds, long regularSeconds, long overtimeSeconds, BigDecimal regularPay,
            BigDecimal overtimePay, BigDecimal grossPay, boolean provisional, long pendingEntries) {
    }

    public record Report(LocalDate periodStart, LocalDate periodEnd, String timezone, String currency,
            Instant calculatedAt, LocalDate workweekCoverageEnd, List<Estimate> estimates) {
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public Report report(LocalDate start, Long employeeId) {
        if (start == null)
            start = periodFor(LocalDate.now(clock.withZone(ZONE)));
        if (!periodFor(start).equals(start))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Pay periods must align with September 25, 2026 in 14-day increments");
        var caller = Caller.current();
        List<EmployeeInfo> people;
        if (caller.manages())
            people = employeeId == null ? workforce.list(0) : List.of(workforce.byId(employeeId));
        else {
            var self = workforce.byAccount(caller.accountId());
            if (employeeId != null && employeeId != self.getEmployeeId())
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only view your own payroll");
            people = List.of(self);
        }
        var from = weekStart(start).atStartOfDay(ZONE).toInstant();
        var to = coverageEnd(start).atStartOfDay(ZONE).toInstant();
        var results = new ArrayList<Estimate>();
        var attendanceByEmployee = attendance
                .entriesByEmployee(people.stream().map(EmployeeInfo::getEmployeeId).toList(), from, to);
        for (var employee : people) {
            var entries = attendanceByEmployee.getOrDefault(employee.getEmployeeId(), List.of());
            var intervals = entries.stream().filter(e -> e.getStatus().equals("APPROVED") && e.hasClockOut()).map(
                    e -> new Interval(Instant.ofEpochSecond(e.getClockIn()), Instant.ofEpochSecond(e.getClockOut())))
                    .toList();
            var rate = new BigDecimal(employee.getHourlyRate());
            var total = calculator.calculate(intervals, start, rate);
            long pending = entries.stream()
                    .filter(e -> e.getStatus().equals("OPEN") || e.getStatus().equals("PENDING_APPROVAL")).count();
            results.add(new Estimate(employee.getEmployeeId(), employee.getName(), employee.getEmployeeNumber(), rate,
                    total.regularSeconds() + total.overtimeSeconds(), total.regularSeconds(), total.overtimeSeconds(),
                    total.regularPay(), total.overtimePay(), total.grossPay(),
                    clock.instant().isBefore(to) || pending > 0, pending));
        }
        return new Report(start, start.plusDays(13), ZONE.getId(), "CAD", clock.instant(),
                coverageEnd(start).minusDays(1), results);
    }
}
