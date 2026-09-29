package com.emssystem.emsschedulingservice.scheduling.controller;

import com.emssystem.emsschedulingservice.scheduling.dto.request.*;
import com.emssystem.emsschedulingservice.scheduling.dto.response.ShiftAssignmentResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RequestMapping("/api")
public interface ShiftAssignmentController {
    @PostMapping("/shifts/{shiftId}/assign")
    ShiftAssignmentResponse assign(@PathVariable Long shiftId, @Valid @RequestBody AssignEmployeeRequest request);

    @PostMapping("/shifts/{shiftId}/respond")
    ShiftAssignmentResponse respond(@RequestHeader("X-User-Id") UUID userId, @PathVariable Long shiftId,
            @Valid @RequestBody RespondToAssignmentRequest request);

    @PostMapping("/shift-assignments/{id}/cancel")
    ShiftAssignmentResponse cancel(@PathVariable Long id);
}
