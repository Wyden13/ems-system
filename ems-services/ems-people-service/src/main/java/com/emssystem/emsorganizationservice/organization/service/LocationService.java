package com.emssystem.emsorganizationservice.organization.service;

import com.emssystem.emsorganizationservice.organization.dto.request.CreateLocationRequest;
import com.emssystem.emsorganizationservice.organization.dto.request.UpdateLocationRequest;
import com.emssystem.emsorganizationservice.organization.dto.response.LocationResponse;

import java.util.List;

public interface LocationService {
    LocationResponse create(CreateLocationRequest request);

    LocationResponse get(Long id);

    List<LocationResponse> list();

    LocationResponse replace(Long id, UpdateLocationRequest request);

    void delete(Long id);
}
