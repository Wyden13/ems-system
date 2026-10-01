package com.emssystem.emsorganizationservice.organization.service;

import com.emssystem.emsorganizationservice.organization.dto.request.CreateDepartmentRequest;
import com.emssystem.emsorganizationservice.organization.dto.request.UpdateDepartmentRequest;
import com.emssystem.emsorganizationservice.organization.dto.response.DepartmentResponse;
import com.emssystem.emsorganizationservice.organization.entity.Department;
import com.emssystem.emsorganizationservice.organization.entity.Location;
import com.emssystem.emsorganizationservice.organization.exception.DepartmentNotFoundException;
import com.emssystem.emsorganizationservice.organization.exception.LocationNotFoundException;
import com.emssystem.emsorganizationservice.organization.mapper.OrganizationMapper;
import com.emssystem.emsorganizationservice.organization.repository.DepartmentRepository;
import com.emssystem.emsorganizationservice.organization.repository.LocationRepository;
import com.emssystem.emsorganizationservice.shared.exception.BusinessRuleException;
import com.emssystem.emsorganizationservice.shared.exception.ErrorCode;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class DefaultDepartmentService implements DepartmentService {
    private final DepartmentRepository departments;
    private final LocationRepository locations;

    public DefaultDepartmentService(DepartmentRepository departments, LocationRepository locations) {
        this.departments = departments;
        this.locations = locations;
    }

    @Override
    @Transactional
    public DepartmentResponse create(CreateDepartmentRequest request) {
        Location location = findLocation(request.locationId());
        String name = request.name().strip();
        validateUniqueName(name, null);
        return OrganizationMapper.toResponse(departments.saveAndFlush(new Department(name, location)));
    }

    @Override
    public DepartmentResponse get(Long id) {
        return OrganizationMapper.toResponse(findDepartment(id));
    }

    @Override
    public List<DepartmentResponse> list(Long locationId) {
        List<Department> result = locationId == null
                ? departments.findAll(Sort.by("id"))
                : departments.findByLocationIdOrderByIdAsc(locationId);
        return result.stream().map(OrganizationMapper::toResponse).toList();
    }

    @Override
    @Transactional
    public DepartmentResponse replace(Long id, UpdateDepartmentRequest request) {
        Department department = findDepartment(id);
        Location location = findLocation(request.locationId());
        String name = request.name().strip();
        validateUniqueName(name, id);
        department.replaceDetails(name, location);
        return OrganizationMapper.toResponse(departments.saveAndFlush(department));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.METHOD_NOT_ALLOWED, "Archive departments instead of deleting them");
    }

    @Override
    @Transactional
    public DepartmentResponse setArchived(Long id, boolean archived) {
        Department department = findDepartment(id);
        department.setArchived(archived);
        return OrganizationMapper.toResponse(departments.saveAndFlush(department));
    }

    private Department findDepartment(Long id) {
        return departments.findById(id).orElseThrow(() -> new DepartmentNotFoundException(id));
    }

    private Location findLocation(Long id) {
        return locations.findById(id).orElseThrow(() -> new LocationNotFoundException(id));
    }

    private void validateUniqueName(String name, Long excludedId) {
        boolean exists = excludedId == null
                ? departments.existsByDepartmentNameIgnoreCase(name)
                : departments.existsByDepartmentNameIgnoreCaseAndIdNot(name, excludedId);
        if (exists) {
            throw new BusinessRuleException(ErrorCode.CONFLICT, "Department name already exists: " + name);
        }
    }
}
