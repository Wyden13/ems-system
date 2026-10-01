package com.emssystem.emsemployeeservice.employee.controller;

import com.emssystem.emsemployeeservice.employee.dto.request.CreateEmployeeRequest;
import com.emssystem.emsemployeeservice.employee.dto.request.UpdateEmployeeRequest;
import com.emssystem.emsemployeeservice.employee.dto.response.EmployeeResponse;
import com.emssystem.emsemployeeservice.employee.dto.response.EmployeeSummaryResponse;
import com.emssystem.emsemployeeservice.employee.service.IEmployeeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/employees")
public class EmployeeController {
    private final IEmployeeService employeeService;

    public EmployeeController(IEmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @PostMapping
    public ResponseEntity<EmployeeResponse> create(@Valid @RequestBody CreateEmployeeRequest request) {
        EmployeeResponse employee = employeeService.create(request);
        return ResponseEntity.created(URI.create("/api/employees/" + employee.id())).body(employee);
    }

    @GetMapping("/{id}")
    public EmployeeResponse get(@PathVariable @Positive Long id) {
        return employeeService.get(id);
    }

    @GetMapping("/by-number/{employeeNumber}")
    public EmployeeResponse getByEmployeeNumber(@PathVariable String employeeNumber) {
        return employeeService.getByEmployeeNumber(employeeNumber);
    }

    @GetMapping("/by-account/{userAccountId}")
    public EmployeeResponse getByAccount(@PathVariable UUID userAccountId) {
        return employeeService.getByUserAccountId(userAccountId);
    }

    @GetMapping
    public Page<EmployeeResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String jobTitle,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) @Positive Long departmentId,
            @PageableDefault(size = 20, sort = "lastName") Pageable pageable) {
        return employeeService.search(active, departmentId, search, jobTitle, pageable);
    }

    @PutMapping("/{id}")
    public EmployeeResponse replace(@PathVariable @Positive Long id,
                                    @Valid @RequestBody UpdateEmployeeRequest request) {
        return employeeService.replace(id, request);
    }

    @PostMapping("/{id}/activate")
    public EmployeeResponse activate(@PathVariable @Positive Long id) {
        return employeeService.activate(id);
    }

    @PostMapping("/{id}/deactivate")
    public EmployeeResponse deactivate(@PathVariable @Positive Long id) {
        return employeeService.deactivate(id);
    }

    @GetMapping("/summary")
    public EmployeeSummaryResponse summary() {
        return employeeService.summary();
    }
}
