package com.emssystem.emsschedulingservice.scheduling.repository;
import com.emssystem.emsschedulingservice.scheduling.entity.ShiftCategory;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ShiftCategoryRepository extends JpaRepository<ShiftCategory,Long>{
    boolean existsByNameIgnoreCase(String name);
}
