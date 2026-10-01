package com.emssystem.emsleaveservice.pto.service;

import com.emssystem.emsleaveservice.pto.controller.LeaveApi.Request;
import java.math.BigDecimal;
import java.time.temporal.ChronoUnit;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

record LeaveRequestDetails(String unit, BigDecimal amount, BigDecimal hours, String category, String signature) {
    private static final Set<String> REASONS = Set.of("Vacation", "Personal leave", "Funeral", "Bereavement",
            "Jury duty", "Family reason", "Medical leave", "Sick leave", "Parental leave", "Other");

    static LeaveRequestDetails from(Request r) {
        boolean legacy = r.requestUnit() == null;
        String unit = legacy ? (r.hours() == null ? "DAYS" : "HOURS") : r.requestUnit();
        if (!Set.of("DAYS", "HOURS").contains(unit)) invalid("Choose days or hours for your request");
        if (r.startDate() == null || r.endDate() == null || r.endDate().isBefore(r.startDate())
                || ChronoUnit.DAYS.between(r.startDate(), r.endDate()) >= 366)
            invalid("Choose a date range of up to one year");
        BigDecimal amount = "DAYS".equals(unit)
                ? BigDecimal.valueOf(ChronoUnit.DAYS.between(r.startDate(), r.endDate()) + 1)
                : (legacy ? r.hours() : r.requestedHours());
        positive(amount, "Enter the number of hours requested");
        BigDecimal hours = r.hours() != null ? r.hours()
                : ("DAYS".equals(unit) ? amount.multiply(BigDecimal.valueOf(8)) : amount);
        positive(hours, "Total hours must be at least 0.25 with up to two decimal places");
        String category = r.reasonCategory() == null ? "" : r.reasonCategory().trim();
        String signature = r.employeeSignature() == null ? "" : r.employeeSignature().trim();
        if ((!legacy || !category.isEmpty()) && !REASONS.contains(category)) invalid("Choose a reason for leave");
        if ((!legacy && signature.isBlank()) || signature.length() > 200)
            invalid("Enter your full name as your employee signature, up to 200 characters");
        return new LeaveRequestDetails(unit, amount, hours, category, signature);
    }

    private static void positive(BigDecimal value, String message) {
        if (value == null || value.compareTo(new BigDecimal("0.25")) < 0 || value.scale() > 2
                || value.compareTo(new BigDecimal("99999999.99")) > 0) invalid(message);
    }

    private static void invalid(String message) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
