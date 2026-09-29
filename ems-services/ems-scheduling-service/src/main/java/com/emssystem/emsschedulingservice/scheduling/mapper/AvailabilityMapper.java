package com.emssystem.emsschedulingservice.scheduling.mapper;
import com.emssystem.emsschedulingservice.scheduling.dto.response.AvailabilityResponse;
import com.emssystem.emsschedulingservice.scheduling.entity.EmployeeAvailability;
public final class AvailabilityMapper{private AvailabilityMapper(){} public static AvailabilityResponse toResponse(EmployeeAvailability a){return new AvailabilityResponse(a.getId(),a.getEmployeeId(),a.getDayOfWeek(),a.getStartTime(),a.getEndTime(),a.getType());}}
