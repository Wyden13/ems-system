package com.emssystem.emsleaveservice.pto.controller;

import com.emssystem.emsleaveservice.pto.service.LeaveOperations;
import com.emssystem.emsleaveservice.pto.dto.request.UpsertPtoTypeRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/pto")
public class LeaveApi {
    public record Request(@NotNull UUID requestKey, @NotNull @Positive Long ptoTypeId, @NotNull LocalDate startDate,
            @NotNull LocalDate endDate,
            @NotNull @DecimalMin("0.25") @Digits(integer = 8, fraction = 2) BigDecimal hours,
            @Size(max = 500) String reason) {
        public Request(UUID requestKey, Long ptoTypeId, LocalDate startDate, LocalDate endDate, BigDecimal hours) {
            this(requestKey, ptoTypeId, startDate, endDate, hours, null);
        }
    }

    public record Decision(@NotNull @PositiveOrZero Long version, @NotNull String decision,
            @Size(max = 500) String comment) {
    }

    public record Cancel(@NotNull @PositiveOrZero Long version, @NotBlank @Size(max = 500) String reason) {
    }

    public record Deduction(@NotNull UUID requestKey, @NotNull @Positive Long employeeId,
            @NotNull @Positive Long ptoTypeId,
            @NotNull @DecimalMin("0.25") @Digits(integer = 8, fraction = 2) BigDecimal hours,
            @NotBlank @Size(max = 500) String reason) {
    }

    public record Adjustment(@NotNull UUID requestKey, @NotNull @Positive Long employeeId,
            @NotNull @Positive Long ptoTypeId, @NotNull @Digits(integer = 8, fraction = 2) BigDecimal hoursDelta,
            @NotBlank @Size(max = 500) String reason) {
    }

    private final LeaveOperations service;

    public LeaveApi(LeaveOperations service) {
        this.service = service;
    }

    @GetMapping("/people")
    public Object people() {
        return service.people();
    }

    @GetMapping("/types")
    public Object types() {
        return service.types();
    }

    @PostMapping("/types")
    public Object createType(@Valid @RequestBody UpsertPtoTypeRequest r) {
        return service.type(null, r);
    }

    @PutMapping("/types/{id}")
    public Object updateType(@PathVariable long id, @Valid @RequestBody UpsertPtoTypeRequest r) {
        return service.type(id, r);
    }

    @DeleteMapping("/types/{id}")
    public void deleteType(@PathVariable long id) {
        service.deleteType(id);
    }

    @GetMapping("/balances/me")
    public Object balances() {
        return service.balances(null);
    }

    @GetMapping("/balances/employees/{employeeId}")
    public Object balances(@PathVariable long employeeId) {
        return service.balances(employeeId);
    }

    @GetMapping("/ledger/{employeeId}")
    public Object ledger(@PathVariable long employeeId) {
        return service.ledger(employeeId);
    }

    @PostMapping("/balances/deduct")
    public Object deduct(@Valid @RequestBody Deduction r) {
        return service.deduct(r);
    }

    @PostMapping("/balances/adjust")
    public Object adjust(@Valid @RequestBody Adjustment r) {
        return service.adjust(r);
    }

    @PostMapping("/requests")
    public Object create(@Valid @RequestBody Request r) {
        return service.create(r);
    }

    @GetMapping("/requests")
    public Object list(@RequestParam(required = false) String status, @RequestParam(required = false) Long employeeId) {
        return service.list(status, employeeId, false);
    }

    @GetMapping("/requests/me")
    public Object mine() {
        return service.list(null, null, true);
    }

    @GetMapping("/requests/{id}")
    public Object get(@PathVariable long id) {
        return service.get(id);
    }

    @GetMapping("/requests/{id}/conflicts")
    public Object conflicts(@PathVariable long id) {
        return service.conflicts(id);
    }

    @GetMapping("/requests/{id}/history")
    public Object history(@PathVariable long id) {
        return service.history(id);
    }

    @PostMapping("/requests/{id}/decision")
    public Object review(@PathVariable long id, @Valid @RequestBody Decision r) {
        return service.review(id, r);
    }

    @PostMapping("/requests/{id}/cancel")
    public Object cancel(@PathVariable long id, @Valid @RequestBody Cancel r) {
        return service.cancel(id, r);
    }
}
