package com.emssystem.emsattendanceservice.attendance.dto.request;
import jakarta.validation.constraints.*;
public record ClockOutRequest(@NotNull @Positive Long entryId) {}
