package com.emssystem.emsorganizationservice.organization.controller;

import com.emssystem.emsorganizationservice.organization.dto.request.CreateLocationRequest;
import com.emssystem.emsorganizationservice.organization.dto.request.UpdateLocationRequest;
import com.emssystem.emsorganizationservice.organization.dto.response.LocationResponse;
import com.emssystem.emsorganizationservice.organization.service.LocationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/locations")
public class LocationController {
    private final LocationService service;

    public LocationController(LocationService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<LocationResponse> create(@Valid @RequestBody CreateLocationRequest request) {
        LocationResponse response = service.create(request);
        return ResponseEntity.created(URI.create("/api/locations/" + response.id())).body(response);
    }

    @GetMapping("/{id}")
    public LocationResponse get(@PathVariable @Positive Long id) {
        return service.get(id);
    }

    @GetMapping
    public List<LocationResponse> list() {
        return service.list();
    }

    @PutMapping("/{id}")
    public LocationResponse replace(@PathVariable @Positive Long id,
            @Valid @RequestBody UpdateLocationRequest request) {
        return service.replace(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable @Positive Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
