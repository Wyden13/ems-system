package com.emssystem.emsorganizationservice.organization.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record UpdateDepartmentRequest(
                @NotBlank @Size(max = 100) String name,
                @NotNull @Positive Long locationId) {
}
