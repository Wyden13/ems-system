package com.emssystem.emsorganizationservice.organization.service;

import com.emssystem.emsorganizationservice.organization.dto.request.CreateLocationRequest;
import com.emssystem.emsorganizationservice.organization.dto.request.UpdateLocationRequest;
import com.emssystem.emsorganizationservice.organization.dto.response.LocationResponse;
import com.emssystem.emsorganizationservice.organization.entity.Location;
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
public class DefaultLocationService implements LocationService {
    private final LocationRepository locations;
    private final DepartmentRepository departments;

    public DefaultLocationService(LocationRepository locations, DepartmentRepository departments) {
        this.locations = locations;
        this.departments = departments;
    }

    @Override
    @Transactional
    public LocationResponse create(CreateLocationRequest request) {
        String name = request.name().strip();
        validateUniqueName(name, null);
        return OrganizationMapper.toResponse(locations.saveAndFlush(new Location(name)));
    }

    @Override
    public LocationResponse get(Long id) {
        return OrganizationMapper.toResponse(findLocation(id));
    }

    @Override
    public List<LocationResponse> list() {
        return locations.findAll(Sort.by("id")).stream().map(OrganizationMapper::toResponse).toList();
    }

    @Override
    @Transactional
    public LocationResponse replace(Long id, UpdateLocationRequest request) {
        Location location = findLocation(id);
        String name = request.name().strip();
        validateUniqueName(name, id);
        location.rename(name);
        return OrganizationMapper.toResponse(locations.saveAndFlush(location));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Location location = findLocation(id);
        if (departments.existsByLocationId(id)) {
            throw new BusinessRuleException(ErrorCode.CONFLICT,
                    "Location still has departments: " + id);
        }
        locations.delete(location);
        locations.flush();
    }

    private Location findLocation(Long id) {
        return locations.findById(id).orElseThrow(() -> new LocationNotFoundException(id));
    }

    private void validateUniqueName(String name, Long excludedId) {
        boolean exists = excludedId == null
                ? locations.existsByNameIgnoreCase(name)
                : locations.existsByNameIgnoreCaseAndIdNot(name, excludedId);
        if (exists) {
            throw new BusinessRuleException(ErrorCode.CONFLICT, "Location name already exists: " + name);
        }
    }
}
