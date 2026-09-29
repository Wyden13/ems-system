package com.emssystem.emsemployeeservice.employee.service;

import com.emssystem.emsemployeeservice.employee.dto.request.*;
import com.emssystem.emsemployeeservice.employee.dto.response.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.UUID;


public interface IEmployeeService {
    Page<EmployeeResponse> search(Boolean active, Long departmentId, String search, Pageable pageable);
    EmployeeResponse create(CreateEmployeeRequest request);
    EmployeeResponse get(Long id);
    EmployeeResponse getByEmployeeNumber(String employeeNumber);
    EmployeeResponse getByUserAccountId(UUID userAccountId);
    Page<EmployeeResponse> list(Boolean active, Long departmentId, Pageable pageable);
    EmployeeResponse replace(Long id, UpdateEmployeeRequest request);
    EmployeeResponse activate(Long id);
    EmployeeResponse deactivate(Long id);
    EmployeeSummaryResponse summary();
}
