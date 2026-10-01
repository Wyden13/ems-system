package com.emssystem.emsleaveservice.pto.service;

import com.emssystem.emsleaveservice.pto.controller.LeaveApi.Request;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class LeaveRequestDetailsTest {
    private final LocalDate day = LocalDate.of(2026, 10, 2);

    private Request input(String unit, BigDecimal total, BigDecimal requestedHours, String signature) {
        return new Request(UUID.randomUUID(), 1L, day, day.plusDays(2), total, "Family trip", unit,
                requestedHours, "Vacation", signature);
    }

    @Test
    void daysIncludeBothDatesAndWeekendsAndUseEightHoursPerDay() {
        var details = LeaveRequestDetails.from(input("DAYS", null, null, "  Alex Morgan  "));
        assertEquals(new BigDecimal("3"), details.amount());
        assertEquals(new BigDecimal("24"), details.hours());
        assertEquals("Alex Morgan", details.signature());
    }

    @Test
    void optionalTotalOverridesDaysAndHourlyDuration() {
        assertEquals(new BigDecimal("12.50"),
                LeaveRequestDetails.from(input("DAYS", new BigDecimal("12.50"), null, "Alex Morgan")).hours());
        var hourly = LeaveRequestDetails.from(input("HOURS", null, new BigDecimal("2.50"), "Alex Morgan"));
        assertEquals(new BigDecimal("2.50"), hourly.hours());
        var overridden = LeaveRequestDetails
                .from(input("HOURS", new BigDecimal("4"), new BigDecimal("2.50"), "Alex Morgan"));
        assertEquals(new BigDecimal("2.50"), overridden.amount());
        assertEquals(new BigDecimal("4"), overridden.hours());
    }

    @Test
    void missingSignatureAndInvalidAmountsCannotReserveHours() {
        assertThrows(ResponseStatusException.class, () -> LeaveRequestDetails.from(input("DAYS", null, null, "  ")));
        assertThrows(ResponseStatusException.class,
                () -> LeaveRequestDetails.from(input("HOURS", null, null, "Alex Morgan")));
        assertThrows(ResponseStatusException.class,
                () -> LeaveRequestDetails.from(input("HOURS", null, new BigDecimal("0"), "Alex Morgan")));
        assertThrows(ResponseStatusException.class,
                () -> LeaveRequestDetails.from(input("DAYS", new BigDecimal("1.001"), null, "Alex Morgan")));
        assertThrows(ResponseStatusException.class,
                () -> LeaveRequestDetails.from(input("WEEKS", null, null, "Alex Morgan")));
    }

    @Test
    void existingExplicitHoursClientsKeepTheirOriginalDuration() {
        var legacy = new Request(UUID.randomUUID(), 1L, day, day, new BigDecimal("4"), "Trip");
        var details = LeaveRequestDetails.from(legacy);
        assertEquals("HOURS", details.unit());
        assertEquals(new BigDecimal("4"), details.hours());
        assertEquals("", details.signature());
    }
}
