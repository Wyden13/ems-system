package com.emssystem.emsemployeeservice.employee;

import com.emssystem.emsemployeeservice.employee.dto.request.CreateEmployeeRequest;
import com.emssystem.emsemployeeservice.employee.dto.request.UpdateEmployeeRequest;
import com.emssystem.emsemployeeservice.employee.dto.response.EmployeeResponse;
import com.emssystem.emsemployeeservice.employee.entity.Employee;
import com.emssystem.emsemployeeservice.employee.entity.EmployeeRole;
import com.emssystem.emsemployeeservice.employee.exception.EmployeeNotFoundException;
import com.emssystem.emsemployeeservice.employee.exception.EmployeeEmailAlreadyExistsException;
import com.emssystem.emsemployeeservice.employee.service.EmployeeNumberGenerator;
import com.emssystem.emsemployeeservice.employee.repository.EmployeeRepository;
import com.emssystem.emsemployeeservice.employee.service.EmployeeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {
    @Mock
    private EmployeeRepository repository;

    @Mock
    private EmployeeNumberGenerator numbers;

    private EmployeeService service;

    @BeforeEach
    void setUp() {
        service = new EmployeeService(repository, org.mockito.Mockito.mock(com.emssystem.emsemployeeservice.shared.grpc.ReferenceValidator.class), numbers);
    }

    @Test
    void createNormalizesInputAndPersistsEmployee() {
        when(repository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

        when(numbers.next()).thenReturn("000001");
        EmployeeResponse response = service.create(createRequest(" PERSON@EXAMPLE.COM "));

        ArgumentCaptor<Employee> captor = ArgumentCaptor.forClass(Employee.class);
        verify(repository).save(captor.capture());
        assertEquals("000001", captor.getValue().getEmployeeNumber());
        assertEquals("person@example.com", response.email());
        assertTrue(response.active());
    }

    @Test
    void createRejectsDuplicateEmail() {
        when(numbers.next()).thenReturn("000002");
        when(repository.existsByEmailIgnoreCase("person@example.com")).thenReturn(true);

        assertThrows(EmployeeEmailAlreadyExistsException.class,
                () -> service.create(createRequest("person@example.com")));
        verify(repository, never()).save(any());
    }

    @Test
    void getRejectsUnknownEmployee() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(EmployeeNotFoundException.class, () -> service.get(99L));
    }

    @Test
    void listUsesCombinedActiveAndDepartmentFilter() {
        Employee employee = employee();
        PageRequest page = PageRequest.of(0, 20);
        when(repository.findByActiveAndDepartmentId(true, 42L, page))
                .thenReturn(new PageImpl<>(List.of(employee), page, 1));

        assertEquals(1, service.list(true, 42L, page).getTotalElements());
        verify(repository).findByActiveAndDepartmentId(true, 42L, page);
    }

    @Test
    void replaceUpdatesEveryMutableField() {
        Employee employee = employee();
        when(repository.findById(1L)).thenReturn(Optional.of(employee));
        when(repository.save(employee)).thenReturn(employee);
        UpdateEmployeeRequest request = new UpdateEmployeeRequest(
                "New", "Name", "NEW@EXAMPLE.COM", "555", "Address",
                LocalDate.of(1991, 2, 3), LocalDate.of(2025, 1, 2), 77L,
                EmployeeRole.MANAGER, null, new BigDecimal("40.00"), "Lead");

        EmployeeResponse response = service.replace(1L, request);

        assertEquals("E-100", response.employeeNumber());
        verifyNoInteractions(numbers);
        assertEquals("new@example.com", response.email());
        assertEquals(77L, response.departmentId());
        assertEquals(EmployeeRole.MANAGER, response.role());
        assertEquals("Lead", response.jobTitle());
    }

    @Test
    void activateDeactivateAndSummaryReturnCurrentState() {
        Employee employee = employee();
        when(repository.findById(1L)).thenReturn(Optional.of(employee));
        when(repository.save(employee)).thenReturn(employee);
        when(repository.count()).thenReturn(3L);
        when(repository.countByActiveTrue()).thenReturn(2L);
        when(repository.countByActiveFalse()).thenReturn(1L);

        assertFalse(service.deactivate(1L).active());
        assertTrue(service.activate(1L).active());
        assertEquals(3L, service.summary().total());
        assertEquals(2L, service.summary().active());
    }

    private CreateEmployeeRequest createRequest(String email) {
        return new CreateEmployeeRequest( "First", "Last", email, null, null,
                LocalDate.of(1990, 1, 1), LocalDate.of(2024, 1, 1), 42L,
                EmployeeRole.EMPLOYEE, null, new BigDecimal("25.00"), "Technician");
    }

    private Employee employee() {
        return new Employee("E-100", "First", "Last", "person@example.com", null, null,
                LocalDate.of(1990, 1, 1), LocalDate.of(2024, 1, 1), 42L,
                EmployeeRole.EMPLOYEE, null, new BigDecimal("25.00"), "Technician");
    }
}
