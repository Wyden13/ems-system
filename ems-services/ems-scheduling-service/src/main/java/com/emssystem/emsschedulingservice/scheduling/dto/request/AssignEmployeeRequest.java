package com.emssystem.emsschedulingservice.scheduling.dto.request;
import jakarta.validation.constraints.NotNull;
public record AssignEmployeeRequest(@NotNull Long employeeId) {}
