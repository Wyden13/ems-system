package com.emssystem.emsschedulingservice.scheduling.controller;

import com.emssystem.emsschedulingservice.scheduling.dto.request.*;
import com.emssystem.emsschedulingservice.scheduling.dto.response.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.List;

@RequestMapping("/api/shifts")
public interface ShiftController {
    @PostMapping
    ShiftResponse create(@Valid @RequestBody CreateShiftRequest request);

    @GetMapping("/{id}")
    ShiftResponse get(@PathVariable Long id);

    @GetMapping
    List<ShiftResponse> list(@RequestParam Instant from, @RequestParam Instant to);

    @PutMapping("/{id}")
    ShiftResponse replace(@PathVariable Long id, @Valid @RequestBody UpdateShiftRequest request);

    @PostMapping("/publish")
    List<ShiftResponse> publish(@Valid @RequestBody PublishShiftRequest request);

    @PostMapping("/{id}/cancel")
    ShiftResponse cancel(@PathVariable Long id);

    @GetMapping("/summary")
    ShiftSummaryResponse summary(@RequestParam Instant from, @RequestParam Instant to);
}
