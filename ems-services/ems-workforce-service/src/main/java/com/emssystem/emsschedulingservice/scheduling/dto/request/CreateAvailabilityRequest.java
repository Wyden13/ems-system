package com.emssystem.emsschedulingservice.scheduling.dto.request;

import com.emssystem.emsschedulingservice.scheduling.enums.AvailabilityType;
import jakarta.validation.constraints.NotNull;
import java.time.*;

public record CreateAvailabilityRequest(@NotNull DayOfWeek dayOfWeek, @NotNull LocalTime startTime,
        @NotNull LocalTime endTime, @NotNull AvailabilityType type) {
}
