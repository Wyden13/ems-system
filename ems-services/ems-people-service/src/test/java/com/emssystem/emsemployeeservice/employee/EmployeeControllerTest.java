package com.emssystem.emsemployeeservice.employee;

import com.emssystem.emsemployeeservice.employee.controller.EmployeeController;
import com.emssystem.emsemployeeservice.employee.dto.request.CreateEmployeeRequest;
import com.emssystem.emsemployeeservice.employee.dto.response.EmployeeResponse;
import com.emssystem.emsemployeeservice.employee.entity.EmployeeRole;
import com.emssystem.emsemployeeservice.employee.service.IEmployeeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeControllerTest {
    @Test
    void listForwardsJobTitleTogetherWithOtherFiltersAndPagination() {
        IEmployeeService service = mock(IEmployeeService.class);
        EmployeeController controller = new EmployeeController(service);
        var pageable = PageRequest.of(1, 20);
        Page<EmployeeResponse> expected = Page.empty(pageable);
        when(service.search(true, 42L, "Alex", "Technician", pageable)).thenReturn(expected);

        assertEquals(expected, controller.list("Alex", "Technician", true, 42L, pageable));
        org.mockito.Mockito.verify(service).search(true, 42L, "Alex", "Technician", pageable);
    }

    @Test
    void createReturnsCreatedStatusAndResourceLocation() {
        IEmployeeService service = mock(IEmployeeService.class);
        EmployeeController controller = new EmployeeController(service);
        CreateEmployeeRequest request = new CreateEmployeeRequest(
                "First", "Last", "person@example.com", null, null,
                LocalDate.of(1990, 1, 1), LocalDate.of(2024, 1, 1), 42L,
                EmployeeRole.EMPLOYEE, null, new BigDecimal("25.00"), "Technician");
        EmployeeResponse response = new EmployeeResponse(
                10L, "E-100", "First", "Last", "person@example.com", null, null,
                request.birthDate(), request.hireDate(), 42L, EmployeeRole.EMPLOYEE,
                null, request.payRate(), request.jobTitle(), true, null, null);
        when(service.create(request)).thenReturn(response);

        ResponseEntity<EmployeeResponse> result = controller.create(request);

        assertEquals(201, result.getStatusCode().value());
        assertEquals("/api/employees/10", result.getHeaders().getLocation().toString());
        assertEquals(response, result.getBody());
    }
}
