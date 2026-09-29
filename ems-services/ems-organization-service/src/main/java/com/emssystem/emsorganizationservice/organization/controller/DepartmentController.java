package com.emssystem.emsorganizationservice.organization.controller;

import com.emssystem.emsorganizationservice.organization.dto.request.CreateDepartmentRequest;
import com.emssystem.emsorganizationservice.organization.dto.request.UpdateDepartmentRequest;
import com.emssystem.emsorganizationservice.organization.dto.response.DepartmentResponse;
import com.emssystem.emsorganizationservice.organization.service.DepartmentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {
    private final DepartmentService service;

    public DepartmentController(DepartmentService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<DepartmentResponse> create(@Valid @RequestBody CreateDepartmentRequest request) {
        DepartmentResponse response = service.create(request);
        return ResponseEntity.created(URI.create("/api/departments/" + response.id())).body(response);
    }

    @GetMapping("/{id}")
    public DepartmentResponse get(@PathVariable @Positive Long id) {
        return service.get(id);
    }

    @GetMapping
    public List<DepartmentResponse> list(
            @RequestParam(required = false) @Positive Long locationId,
            @RequestParam(required = false) Boolean archived) {
        return service.list(locationId).stream().filter(d -> archived == null || d.archived() == archived).toList();
    }

    @PutMapping("/{id}")
    public DepartmentResponse replace(@PathVariable @Positive Long id,
            @Valid @RequestBody UpdateDepartmentRequest request) {
        return service.replace(id, request);
    }

    @PostMapping("/{id}/archive")
    public DepartmentResponse archive(@PathVariable @Positive Long id) {
        return service.setArchived(id, true);
    }

    @PostMapping("/{id}/restore")
    public DepartmentResponse restore(@PathVariable @Positive Long id) {
        return service.setArchived(id, false);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable @Positive Long id) {
        return ResponseEntity.status(405).header("Allow", "GET, PUT").build();
    }
}
