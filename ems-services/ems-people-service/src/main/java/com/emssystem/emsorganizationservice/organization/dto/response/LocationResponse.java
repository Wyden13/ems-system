package com.emssystem.emsorganizationservice.organization.dto.response;

import java.time.Instant;

public record LocationResponse(
                Long id,
                String name,
                Instant createdAt,
                Instant updatedAt) {
}
