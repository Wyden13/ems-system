package com.emssystem.emsemployeeservice;

import com.emssystem.emsemployeeservice.employee.entity.Employee;
import com.emssystem.emsemployeeservice.employee.entity.EmployeeRole;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EmsEmployeeServiceApplicationTests {
    @Test
    void initializesEmployeeWithScalarDepartmentReference() {
        Employee employee = new Employee("E-1", "A", "B", "a@example.com", null, null,
                null, LocalDate.now(), 42L, EmployeeRole.EMPLOYEE, null,
                new BigDecimal("25.00"), "Technician");

        assertTrue(employee.isActive());
        assertEquals(42L, employee.getDepartmentId());
    }
}
