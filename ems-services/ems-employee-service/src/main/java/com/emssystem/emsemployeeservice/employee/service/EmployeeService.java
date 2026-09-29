package com.emssystem.emsemployeeservice.employee.service;

import com.emssystem.emsemployeeservice.employee.dto.request.CreateEmployeeRequest;
import com.emssystem.emsemployeeservice.employee.dto.request.UpdateEmployeeRequest;
import com.emssystem.emsemployeeservice.employee.dto.response.EmployeeResponse;
import com.emssystem.emsemployeeservice.employee.dto.response.EmployeeSummaryResponse;
import com.emssystem.emsemployeeservice.employee.entity.Employee;
import com.emssystem.emsemployeeservice.employee.exception.EmployeeEmailAlreadyExistsException;
import com.emssystem.emsemployeeservice.employee.exception.EmployeeNotFoundException;
import com.emssystem.emsemployeeservice.employee.exception.EmployeeNumberAlreadyExistsException;
import com.emssystem.emsemployeeservice.employee.exception.UserAccountAlreadyLinkedException;
import com.emssystem.emsemployeeservice.employee.mapper.EmployeeMapper;
import com.emssystem.emsemployeeservice.employee.repository.EmployeeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
@Transactional
public class EmployeeService implements IEmployeeService {
    private final EmployeeRepository employeeRepository;
    private final EmployeeNumberGenerator numbers;

    private final com.emssystem.emsemployeeservice.shared.grpc.ReferenceValidator references;
    public EmployeeService(EmployeeRepository employeeRepository, com.emssystem.emsemployeeservice.shared.grpc.ReferenceValidator references, EmployeeNumberGenerator numbers) {
        this.numbers = numbers;
        this.references=references;
        this.employeeRepository = employeeRepository;
    }

    @Override
    public EmployeeResponse create(CreateEmployeeRequest request) {
        references.validate(request.departmentId(),request.userAccountId(),null,null);
        String employeeNumber = numbers.next();
        String email = normalizeEmail(request.email());
        validateUniqueFields(employeeNumber, email, request.userAccountId(), null);

        Employee employee = new Employee(
                employeeNumber,
                normalizeRequired(request.firstName()),
                normalizeRequired(request.lastName()),
                email,
                normalizeNullable(request.phoneNumber()),
                normalizeNullable(request.address()),
                request.birthDate(),
                request.hireDate(),
                request.departmentId(),
                request.role(),
                request.userAccountId(),
                request.payRate(),
                normalizeNullable(request.jobTitle()));

        return EmployeeMapper.toResponse(employeeRepository.save(employee));
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeResponse get(Long id) {
        return EmployeeMapper.toResponse(findEmployee(id));
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeResponse getByEmployeeNumber(String employeeNumber) {
        String normalizedNumber = normalizeEmployeeNumber(employeeNumber);
        Employee employee = employeeRepository.findByEmployeeNumberIgnoreCase(normalizedNumber)
                .orElseThrow(() -> new EmployeeNotFoundException(normalizedNumber));
        return EmployeeMapper.toResponse(employee);
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeResponse getByUserAccountId(UUID userAccountId) {
        Employee employee = employeeRepository.findByUserAccountId(userAccountId)
                .orElseThrow(() -> new EmployeeNotFoundException(userAccountId));
        return EmployeeMapper.toResponse(employee);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EmployeeResponse> list(Boolean active, Long departmentId, Pageable pageable) {
        Page<Employee> employees;
        if (active != null && departmentId != null) {
            employees = employeeRepository.findByActiveAndDepartmentId(active, departmentId, pageable);
        } else if (active != null) {
            employees = employeeRepository.findByActive(active, pageable);
        } else if (departmentId != null) {
            employees = employeeRepository.findByDepartmentId(departmentId, pageable);
        } else {
            employees = employeeRepository.findAll(pageable);
        }
        return employees.map(EmployeeMapper::toResponse);
    }

    @Override @Transactional(readOnly=true)
    public Page<EmployeeResponse> search(Boolean active, Long departmentId, String search, Pageable pageable) {
        if (search==null || search.isBlank()) return list(active,departmentId,pageable);
        String queryText="%"+search.trim().toLowerCase(Locale.ROOT).replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%";
        return employeeRepository.findAll((root,query,cb) -> {
            var predicates=new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            if (active!=null) predicates.add(cb.equal(root.get("active"),active));
            if (departmentId!=null) predicates.add(cb.equal(root.get("departmentId"),departmentId));
            predicates.add(cb.or(cb.like(cb.lower(root.get("employeeNumber")),queryText,'\\'),
                cb.like(cb.lower(root.get("email")),queryText,'\\'),
                cb.like(cb.lower(cb.concat(cb.concat(root.get("firstName")," "),root.get("lastName"))),queryText,'\\')));
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        },pageable).map(EmployeeMapper::toResponse);
    }
    @Override
    public EmployeeResponse replace(Long id, UpdateEmployeeRequest request) {
        Employee employee = findEmployee(id);
        String employeeNumber = employee.getEmployeeNumber();
        String email = normalizeEmail(request.email());
        validateUniqueFields(employeeNumber, email, request.userAccountId(), id);

        references.validate(request.departmentId(),request.userAccountId(),employee.getDepartmentId(),employee.getUserAccountId());
        employee.replaceDetails(
                employeeNumber,
                normalizeRequired(request.firstName()),
                normalizeRequired(request.lastName()),
                email,
                normalizeNullable(request.phoneNumber()),
                normalizeNullable(request.address()),
                request.birthDate(),
                request.hireDate(),
                request.departmentId(),
                request.role(),
                request.userAccountId(),
                request.payRate(),
                normalizeNullable(request.jobTitle()));

        return EmployeeMapper.toResponse(employeeRepository.save(employee));
    }

    @Override
    public EmployeeResponse activate(Long id) {
        Employee employee = findEmployee(id);
        employee.activate();
        return EmployeeMapper.toResponse(employeeRepository.save(employee));
    }

    @Override
    public EmployeeResponse deactivate(Long id) {
        Employee employee = findEmployee(id);
        employee.deactivate();
        return EmployeeMapper.toResponse(employeeRepository.save(employee));
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeSummaryResponse summary() {
        long total = employeeRepository.count();
        long active = employeeRepository.countByActiveTrue();
        long inactive = employeeRepository.countByActiveFalse();
        return new EmployeeSummaryResponse(total, active, inactive);
    }

    private Employee findEmployee(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new EmployeeNotFoundException(id));
    }

    private void validateUniqueFields(String employeeNumber, String email, UUID userAccountId, Long excludedId) {
        boolean numberExists = excludedId == null
                ? employeeRepository.existsByEmployeeNumberIgnoreCase(employeeNumber)
                : employeeRepository.existsByEmployeeNumberIgnoreCaseAndIdNot(employeeNumber, excludedId);
        if (numberExists) {
            throw new EmployeeNumberAlreadyExistsException(employeeNumber);
        }

        boolean emailExists = excludedId == null
                ? employeeRepository.existsByEmailIgnoreCase(email)
                : employeeRepository.existsByEmailIgnoreCaseAndIdNot(email, excludedId);
        if (emailExists) {
            throw new EmployeeEmailAlreadyExistsException(email);
        }

        if (userAccountId != null) {
            boolean accountExists = excludedId == null
                    ? employeeRepository.existsByUserAccountId(userAccountId)
                    : employeeRepository.existsByUserAccountIdAndIdNot(userAccountId, excludedId);
            if (accountExists) {
                throw new UserAccountAlreadyLinkedException(userAccountId);
            }
        }
    }

    private String normalizeEmail(String email) {
        return normalizeRequired(email).toLowerCase(Locale.ROOT);
    }

    private String normalizeEmployeeNumber(String employeeNumber) {
        return normalizeRequired(employeeNumber).toUpperCase(Locale.ROOT);
    }

    private String normalizeRequired(String value) {
        return value.trim();
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
