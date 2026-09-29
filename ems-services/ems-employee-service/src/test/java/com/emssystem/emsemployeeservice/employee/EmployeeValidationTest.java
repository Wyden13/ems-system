package com.emssystem.emsemployeeservice.employee;

import com.emssystem.emsemployeeservice.employee.dto.request.CreateEmployeeRequest;
import com.emssystem.emsemployeeservice.employee.entity.EmployeeRole;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertFalse;

@ExtendWith(MockitoExtension.class)
class EmployeeValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void rejectsInvalidCreateRequest() {
        CreateEmployeeRequest request = new CreateEmployeeRequest(
                "", "", "not-an-email", null, null,
                LocalDate.now().plusDays(1), LocalDate.now().plusDays(1), 0L,
                EmployeeRole.EMPLOYEE, null, new BigDecimal("-1.00"), null);

        assertFalse(validator.validate(request).isEmpty());
    }
}
