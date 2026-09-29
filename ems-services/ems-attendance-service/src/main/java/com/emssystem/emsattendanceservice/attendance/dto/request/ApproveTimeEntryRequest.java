package com.emssystem.emsattendanceservice.attendance.dto.request;
import jakarta.validation.constraints.*;
public record ApproveTimeEntryRequest(@NotNull Long version,@Size(max=500) String comment) {}
