package com.emssystem.emsorganizationservice.organization.exception;

import com.emssystem.emsorganizationservice.shared.exception.ResourceNotFoundException;

public class DepartmentNotFoundException extends ResourceNotFoundException {
    public DepartmentNotFoundException(Long id) {
        super("Department", id);
    }
}
