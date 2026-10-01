package com.emssystem.emsorganizationservice.organization.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateLocationRequest(
                @NotBlank @Size(max = 100) String name) {
}
