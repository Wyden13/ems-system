package com.emssystem.emsschedulingservice.scheduling.dto.response;
import com.emssystem.emsschedulingservice.scheduling.enums.AvailabilityType;
import java.time.*;
public record AvailabilityResponse(Long id,Long employeeId,DayOfWeek dayOfWeek,LocalTime startTime,LocalTime endTime,AvailabilityType type) {}
