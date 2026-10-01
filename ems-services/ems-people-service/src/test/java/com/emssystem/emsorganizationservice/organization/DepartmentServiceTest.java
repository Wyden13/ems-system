package com.emssystem.emsorganizationservice.organization;

import com.emssystem.emsorganizationservice.organization.dto.request.*;
import com.emssystem.emsorganizationservice.organization.entity.*;
import com.emssystem.emsorganizationservice.organization.exception.*;
import com.emssystem.emsorganizationservice.organization.repository.*;
import com.emssystem.emsorganizationservice.organization.service.DefaultDepartmentService;
import com.emssystem.emsorganizationservice.shared.exception.BusinessRuleException;
import com.emssystem.emsorganizationservice.shared.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DepartmentServiceTest {
    @Mock
    DepartmentRepository departments;
    @Mock
    LocationRepository locations;
    DefaultDepartmentService service;
    Location calgary;

    @BeforeEach
    void setUp() {
        service = new DefaultDepartmentService(departments, locations);
        calgary = new Location("Calgary");
        ReflectionTestUtils.setField(calgary, "id", 1L);
    }

    @Test
    void createsTrimmedDepartmentAtExistingLocation() {
        when(locations.findById(1L)).thenReturn(Optional.of(calgary));
        when(departments.saveAndFlush(any(Department.class))).thenAnswer(call -> call.getArgument(0));
        var result = service.create(new CreateDepartmentRequest(" Operations ", 1L));
        assertEquals("Operations", result.name());
        assertEquals(1L, result.locationId());
        assertEquals("Calgary", result.locationName());
        verify(departments).existsByDepartmentNameIgnoreCase("Operations");
    }

    @Test
    void missingParentPreventsCreation() {
        assertThrows(LocationNotFoundException.class,
                () -> service.create(new CreateDepartmentRequest("Operations", 99L)));
        verify(departments, never()).saveAndFlush(any());
    }

    @Test
    void duplicateNameIsRejectedGlobally() {
        when(locations.findById(1L)).thenReturn(Optional.of(calgary));
        when(departments.existsByDepartmentNameIgnoreCase("operations")).thenReturn(true);
        var error = assertThrows(BusinessRuleException.class,
                () -> service.create(new CreateDepartmentRequest(" operations ", 1L)));
        assertEquals(ErrorCode.CONFLICT, error.getCode());
        verify(departments, never()).saveAndFlush(any());
    }

    @Test
    void getsDepartmentIncludingLocation() {
        when(departments.findById(2L)).thenReturn(Optional.of(new Department("Operations", calgary)));
        assertEquals("Calgary", service.get(2L).locationName());
    }

    @Test
    void missingDepartmentFailsForGetUpdateAndDelete() {
        assertThrows(DepartmentNotFoundException.class, () -> service.get(99L));
        assertThrows(DepartmentNotFoundException.class,
                () -> service.replace(99L, new UpdateDepartmentRequest("Operations", 1L)));
        assertThrows(DepartmentNotFoundException.class, () -> service.setArchived(99L, true));
        verify(departments, never()).saveAndFlush(any());
        verify(departments, never()).delete(any(Department.class));
    }

    @Test
    void listsAllDepartmentsOrFiltersByLocation() {
        when(departments.findAll(Sort.by("id"))).thenReturn(List.of(new Department("Operations", calgary)));
        when(departments.findByLocationIdOrderByIdAsc(1L)).thenReturn(List.of(new Department("Operations", calgary)));
        assertEquals(1, service.list(null).size());
        assertEquals(1L, service.list(1L).get(0).locationId());
    }

    @Test
    void unknownLocationFilterReturnsEmptyList() {
        assertTrue(service.list(99L).isEmpty());
        verifyNoInteractions(locations);
    }

    @Test
    void replacesNameAndMovesDepartmentKeepingIdentity() {
        Department department = new Department("Operations", calgary);
        ReflectionTestUtils.setField(department, "id", 2L);
        Location edmonton = new Location("Edmonton");
        ReflectionTestUtils.setField(edmonton, "id", 3L);
        when(departments.findById(2L)).thenReturn(Optional.of(department));
        when(locations.findById(3L)).thenReturn(Optional.of(edmonton));
        when(departments.saveAndFlush(department)).thenReturn(department);
        var result = service.replace(2L, new UpdateDepartmentRequest(" OPERATIONS ", 3L));
        assertEquals(2L, result.id());
        assertEquals("OPERATIONS", result.name());
        assertEquals(3L, result.locationId());
        assertEquals("Edmonton", result.locationName());
        verify(departments).existsByDepartmentNameIgnoreCaseAndIdNot("OPERATIONS", 2L);
    }

    @Test
    void missingNewLocationDoesNotMutateDepartment() {
        Department department = new Department("Operations", calgary);
        when(departments.findById(2L)).thenReturn(Optional.of(department));
        assertThrows(LocationNotFoundException.class,
                () -> service.replace(2L, new UpdateDepartmentRequest("Changed", 99L)));
        assertEquals("Operations", department.getDepartmentName());
        assertSame(calgary, department.getLocation());
        verify(departments, never()).saveAndFlush(any());
    }

    @Test
    void duplicateReplacementDoesNotMutateDepartment() {
        Department department = new Department("Operations", calgary);
        when(departments.findById(2L)).thenReturn(Optional.of(department));
        when(locations.findById(1L)).thenReturn(Optional.of(calgary));
        when(departments.existsByDepartmentNameIgnoreCaseAndIdNot("Sales", 2L)).thenReturn(true);
        assertThrows(BusinessRuleException.class,
                () -> service.replace(2L, new UpdateDepartmentRequest("Sales", 1L)));
        assertEquals("Operations", department.getDepartmentName());
        verify(departments, never()).saveAndFlush(any());
    }

    @Test
    void archivingDepartmentPreservesItsIdentityAndLocation() {
        Department department = new Department("Operations", calgary);
        when(departments.findById(2L)).thenReturn(Optional.of(department));
        when(departments.saveAndFlush(department)).thenReturn(department);
        assertTrue(service.setArchived(2L, true).archived());
        assertFalse(service.setArchived(2L, false).archived());
        verify(departments, never()).delete(any(Department.class));
        verifyNoInteractions(locations);
    }
}
