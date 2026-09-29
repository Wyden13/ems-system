package com.emssystem.emsschedulingservice.scheduling.controller;

import com.emssystem.emsschedulingservice.scheduling.dto.request.CreateAvailabilityRequest;
import com.emssystem.emsschedulingservice.scheduling.dto.response.AvailabilityResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RequestMapping("/api/availability")
public interface AvailabilityController {
    @PostMapping
    AvailabilityResponse create(@RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody CreateAvailabilityRequest request);

    @GetMapping("/me")
    List<AvailabilityResponse> mine(@RequestHeader("X-User-Id") UUID userId);

    @PutMapping("/{id}")
    AvailabilityResponse replace(@RequestHeader("X-User-Id") UUID userId, @PathVariable Long id,
            @Valid @RequestBody CreateAvailabilityRequest request);

    @DeleteMapping("/{id}")
    void delete(@RequestHeader("X-User-Id") UUID userId, @PathVariable Long id);
}
