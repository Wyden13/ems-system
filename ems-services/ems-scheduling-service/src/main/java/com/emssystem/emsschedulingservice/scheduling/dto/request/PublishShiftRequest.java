package com.emssystem.emsschedulingservice.scheduling.dto.request;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
public record PublishShiftRequest(@NotNull Instant from,@NotNull Instant to) {}
