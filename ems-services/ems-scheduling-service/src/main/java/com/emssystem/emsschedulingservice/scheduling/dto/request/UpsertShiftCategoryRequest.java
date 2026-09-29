package com.emssystem.emsschedulingservice.scheduling.dto.request;
import jakarta.validation.constraints.*;
import java.time.LocalTime;
public record UpsertShiftCategoryRequest(@NotBlank @Size(max=50) String name,@Pattern(regexp="^#[0-9A-Fa-f]{6}$") String color,
        @NotNull LocalTime defaultStartTime,@NotNull LocalTime defaultEndTime) {}
