package com.emssystem.emsemployeeservice.employee.dto.request;

import com.emssystem.emsemployeeservice.employee.entity.EmployeeRole;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record UpdateEmployeeRequest(
                @NotBlank @Size(max = 50) String firstName,
                @NotBlank @Size(max = 50) String lastName,
                @NotBlank @Email @Size(max = 320) String email,
                @Size(max = 40) String phoneNumber,
                @Size(max = 500) String address,
                @Past LocalDate birthDate,
                @NotNull @PastOrPresent LocalDate hireDate,
                @NotNull @Positive Long departmentId,
                @NotNull EmployeeRole role,
                UUID userAccountId,
                @NotNull @DecimalMin("0.00") @Digits(integer = 17, fraction = 2) BigDecimal payRate,
                @Size(max = 100) String jobTitle) {
}
