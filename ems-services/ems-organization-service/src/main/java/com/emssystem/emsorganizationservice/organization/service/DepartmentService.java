package com.emssystem.emsorganizationservice.organization.service;

import com.emssystem.emsorganizationservice.organization.dto.request.CreateDepartmentRequest;
import com.emssystem.emsorganizationservice.organization.dto.request.UpdateDepartmentRequest;
import com.emssystem.emsorganizationservice.organization.dto.response.DepartmentResponse;

import java.util.List;

public interface DepartmentService {
    DepartmentResponse create(CreateDepartmentRequest request);
    DepartmentResponse get(Long id);
    List<DepartmentResponse> list(Long locationId);
    DepartmentResponse replace(Long id, UpdateDepartmentRequest request);
    void delete(Long id);
    DepartmentResponse setArchived(Long id, boolean archived);
}
