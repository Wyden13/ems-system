package com.emssystem.emsorganizationservice.organization.repository;

import com.emssystem.emsorganizationservice.organization.entity.Department;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    boolean existsByDepartmentNameIgnoreCase(String name);
    boolean existsByDepartmentNameIgnoreCaseAndIdNot(String name, Long id);
    boolean existsByLocationId(Long locationId);

    @EntityGraph(attributePaths = "location")
    List<Department> findByLocationIdOrderByIdAsc(Long locationId);

    @Override
    @EntityGraph(attributePaths = "location")
    List<Department> findAll(Sort sort);

    @Override
    @EntityGraph(attributePaths = "location")
    Optional<Department> findById(Long id);
}
