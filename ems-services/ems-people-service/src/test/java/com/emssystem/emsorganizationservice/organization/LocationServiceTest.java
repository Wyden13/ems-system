package com.emssystem.emsorganizationservice.organization;

import com.emssystem.emsorganizationservice.organization.dto.request.*;
import com.emssystem.emsorganizationservice.organization.entity.Location;
import com.emssystem.emsorganizationservice.organization.exception.LocationNotFoundException;
import com.emssystem.emsorganizationservice.organization.repository.*;
import com.emssystem.emsorganizationservice.organization.service.DefaultLocationService;
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
class LocationServiceTest {
    @Mock
    LocationRepository locations;
    @Mock
    DepartmentRepository departments;
    DefaultLocationService service;

    @BeforeEach
    void setUp() {
        service = new DefaultLocationService(locations, departments);
    }

    @Test
    void createsTrimmedNameAndMapsSavedRecord() {
        when(locations.saveAndFlush(any(Location.class))).thenAnswer(call -> {
            Location saved = call.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 12L);
            return saved;
        });
        var result = service.create(new CreateLocationRequest("  Calgary\t"));
        assertEquals("Calgary", result.name());
        assertEquals(12L, result.id());
        verify(locations).existsByNameIgnoreCase("Calgary");
    }

    @Test
    void rejectsDuplicateCreateWithoutWriting() {
        when(locations.existsByNameIgnoreCase("calgary")).thenReturn(true);
        var error = assertThrows(BusinessRuleException.class,
                () -> service.create(new CreateLocationRequest(" calgary ")));
        assertEquals(ErrorCode.CONFLICT, error.getCode());
        verify(locations, never()).saveAndFlush(any());
    }

    @Test
    void getsExistingLocation() {
        when(locations.findById(1L)).thenReturn(Optional.of(new Location("Calgary")));
        assertEquals("Calgary", service.get(1L).name());
    }

    @Test
    void missingLocationFailsForGetUpdateAndDelete() {
        assertThrows(LocationNotFoundException.class, () -> service.get(99L));
        assertThrows(LocationNotFoundException.class,
                () -> service.replace(99L, new UpdateLocationRequest("Calgary")));
        assertThrows(LocationNotFoundException.class, () -> service.delete(99L));
        verify(locations, never()).saveAndFlush(any());
        verify(locations, never()).delete(any(Location.class));
    }

    @Test
    void listsLocationsInStableOrder() {
        when(locations.findAll(Sort.by("id"))).thenReturn(List.of(new Location("Calgary"), new Location("Edmonton")));
        assertEquals(List.of("Calgary", "Edmonton"), service.list().stream().map(r -> r.name()).toList());
    }

    @Test
    void emptyListIsSupported() {
        when(locations.findAll(Sort.by("id"))).thenReturn(List.of());
        assertTrue(service.list().isEmpty());
    }

    @Test
    void replacementExcludesItselfFromDuplicateCheckAndKeepsIdentity() {
        Location location = new Location("Calgary");
        ReflectionTestUtils.setField(location, "id", 1L);
        when(locations.findById(1L)).thenReturn(Optional.of(location));
        when(locations.saveAndFlush(location)).thenReturn(location);
        var result = service.replace(1L, new UpdateLocationRequest(" CALGARY "));
        assertEquals(1L, result.id());
        assertEquals("CALGARY", result.name());
        verify(locations).existsByNameIgnoreCaseAndIdNot("CALGARY", 1L);
        verify(locations, never()).existsByNameIgnoreCase(any());
    }

    @Test
    void duplicateReplacementDoesNotMutateEntity() {
        Location location = new Location("Calgary");
        when(locations.findById(1L)).thenReturn(Optional.of(location));
        when(locations.existsByNameIgnoreCaseAndIdNot("Edmonton", 1L)).thenReturn(true);
        assertThrows(BusinessRuleException.class,
                () -> service.replace(1L, new UpdateLocationRequest("Edmonton")));
        assertEquals("Calgary", location.getName());
        verify(locations, never()).saveAndFlush(any());
    }

    @Test
    void occupiedLocationCannotBeDeleted() {
        when(locations.findById(1L)).thenReturn(Optional.of(new Location("Calgary")));
        when(departments.existsByLocationId(1L)).thenReturn(true);
        var error = assertThrows(BusinessRuleException.class, () -> service.delete(1L));
        assertEquals(ErrorCode.CONFLICT, error.getCode());
        verify(locations, never()).delete(any(Location.class));
    }

    @Test
    void deletesEmptyLocationAndFlushesConstraints() {
        Location location = new Location("Calgary");
        when(locations.findById(1L)).thenReturn(Optional.of(location));
        service.delete(1L);
        verify(locations).delete(location);
        verify(locations).flush();
    }
}
