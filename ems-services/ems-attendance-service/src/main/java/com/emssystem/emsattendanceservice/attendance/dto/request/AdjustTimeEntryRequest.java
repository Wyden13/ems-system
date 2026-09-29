package com.emssystem.emsattendanceservice.attendance.dto.request;
import jakarta.validation.constraints.*;
import java.time.Instant;
public record AdjustTimeEntryRequest(@NotNull Long version,@NotNull Instant clockIn,@NotNull Instant clockOut,@NotBlank @Size(max=500) String reason) {}
