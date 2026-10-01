package com.emssystem.emsattendanceservice.attendance.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ClockInRequest(@NotNull UUID requestId) {
}
