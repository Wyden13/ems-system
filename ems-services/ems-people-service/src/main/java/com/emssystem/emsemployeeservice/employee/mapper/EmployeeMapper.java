package com.emssystem.emsemployeeservice.employee.mapper;

import com.emssystem.emsemployeeservice.employee.dto.response.EmployeeResponse;
import com.emssystem.emsemployeeservice.employee.entity.Employee;

public final class EmployeeMapper {
    private EmployeeMapper() {
    }

    public static EmployeeResponse toResponse(Employee employee) {
        return new EmployeeResponse(
                employee.getId(),
                employee.getEmployeeNumber(),
                employee.getFirstName(),
                employee.getLastName(),
                employee.getEmail(),
                employee.getPhoneNumber(),
                employee.getAddress(),
                employee.getBirthDate(),
                employee.getHireDate(),
                employee.getDepartmentId(),
                employee.getRole(),
                employee.getUserAccountId(),
                employee.getPayRate(),
                employee.getJobTitle(),
                employee.isActive(),
                employee.getCreatedAt(),
                employee.getUpdatedAt());
    }
}
