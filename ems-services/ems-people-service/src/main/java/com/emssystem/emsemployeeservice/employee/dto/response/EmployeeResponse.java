package com.emssystem.emsemployeeservice.employee.dto.response;

import com.emssystem.emsemployeeservice.employee.entity.Employee;
import com.emssystem.emsemployeeservice.employee.entity.EmployeeRole;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record EmployeeResponse(
                Long id,
                String employeeNumber,
                String firstName,
                String lastName,
                String email,
                String phoneNumber,
                String address,
                LocalDate birthDate,
                LocalDate hireDate,
                Long departmentId,
                EmployeeRole role,
                UUID userAccountId,
                BigDecimal payRate,
                String jobTitle,
                boolean active,
                Instant createdAt,
                Instant updatedAt) {
}
