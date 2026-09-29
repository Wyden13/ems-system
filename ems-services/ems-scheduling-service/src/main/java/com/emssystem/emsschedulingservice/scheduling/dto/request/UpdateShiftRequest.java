package com.emssystem.emsschedulingservice.scheduling.dto.request;
import jakarta.validation.constraints.*;
import java.time.Instant;
public record UpdateShiftRequest(@NotNull Long categoryId,@NotNull Instant startsAt,@NotNull Instant endsAt,@NotNull Long locationId,@Min(1) int requiredEmployees) {}
