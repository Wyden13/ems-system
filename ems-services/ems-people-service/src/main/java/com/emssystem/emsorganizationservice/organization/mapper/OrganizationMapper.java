package com.emssystem.emsorganizationservice.organization.mapper;

import com.emssystem.emsorganizationservice.organization.dto.response.DepartmentResponse;
import com.emssystem.emsorganizationservice.organization.dto.response.LocationResponse;
import com.emssystem.emsorganizationservice.organization.entity.Department;
import com.emssystem.emsorganizationservice.organization.entity.Location;

public final class OrganizationMapper {
    private OrganizationMapper() {
    }

    public static LocationResponse toResponse(Location location) {
        return new LocationResponse(location.getId(), location.getName(),
                location.getCreatedAt(), location.getUpdatedAt());
    }

    public static DepartmentResponse toResponse(Department department) {
        return new DepartmentResponse(department.getId(), department.getDepartmentName(),
                department.getLocation().getId(), department.getLocation().getName(),
                department.getCreatedAt(), department.getUpdatedAt(), department.isArchived());
    }
}
