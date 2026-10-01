package com.emssystem.emsorganizationservice.organization.dto.response;

import java.time.Instant;

public record DepartmentResponse(
        Long id,
        String name,
        Long locationId,
        String locationName,
        Instant createdAt,
        Instant updatedAt,
        boolean archived) {
    public DepartmentResponse(Long id, String name, Long locationId, String locationName, Instant createdAt,
            Instant updatedAt) {
        this(id, name, locationId, locationName, createdAt, updatedAt, false);
    }
}
