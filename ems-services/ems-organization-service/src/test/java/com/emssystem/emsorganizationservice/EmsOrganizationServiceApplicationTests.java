package com.emssystem.emsorganizationservice;

import com.emssystem.emsorganizationservice.organization.entity.Department;
import com.emssystem.emsorganizationservice.organization.entity.Location;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class EmsOrganizationServiceApplicationTests {
    @Test
    void initializesDepartmentWithLocation() {
        Location location = new Location("Calgary");
        Department department = new Department("Operations", location);

        assertEquals("Operations", department.getDepartmentName());
        assertEquals(location, department.getLocation());
    }
}
