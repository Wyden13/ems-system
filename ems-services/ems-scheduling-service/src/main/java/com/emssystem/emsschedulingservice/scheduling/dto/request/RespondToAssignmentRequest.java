package com.emssystem.emsschedulingservice.scheduling.dto.request;
import com.emssystem.emsschedulingservice.scheduling.enums.AssignmentStatus;
import jakarta.validation.constraints.NotNull;
public record RespondToAssignmentRequest(@NotNull AssignmentStatus status) {}
