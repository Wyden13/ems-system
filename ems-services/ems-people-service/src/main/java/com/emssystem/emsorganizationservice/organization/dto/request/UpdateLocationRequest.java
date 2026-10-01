package com.emssystem.emsorganizationservice.organization.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateLocationRequest(
                @NotBlank @Size(max = 100) String name) {
}
