package com.emssystem.emsemployeeservice.employee.repository;

import com.emssystem.emsemployeeservice.employee.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;
import java.util.UUID;

public interface EmployeeRepository extends JpaRepository<Employee, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Employee> {
    Optional<Employee> findByEmployeeNumberIgnoreCase(String employeeNumber);
    Optional<Employee> findByUserAccountId(UUID userAccountId);
    boolean existsByEmployeeNumberIgnoreCase(String employeeNumber);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByUserAccountId(UUID userAccountId);
    boolean existsByEmployeeNumberIgnoreCaseAndIdNot(String employeeNumber, Long id);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);
    boolean existsByUserAccountIdAndIdNot(UUID userAccountId, Long id);
    Page<Employee> findByActive(boolean active, Pageable pageable);
    Page<Employee> findByDepartmentId(Long departmentId, Pageable pageable);
    Page<Employee> findByActiveAndDepartmentId(boolean active, Long departmentId, Pageable pageable);
    long countByActiveTrue();
    long countByActiveFalse();
}
