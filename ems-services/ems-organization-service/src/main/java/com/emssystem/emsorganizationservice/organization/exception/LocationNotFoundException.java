package com.emssystem.emsorganizationservice.organization.exception;

import com.emssystem.emsorganizationservice.shared.exception.ResourceNotFoundException;

public class LocationNotFoundException extends ResourceNotFoundException {
    public LocationNotFoundException(Long id) {
        super("Location", id);
    }
}
