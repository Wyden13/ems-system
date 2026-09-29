package com.emssystem.emsschedulingservice.scheduling.repository;
import com.emssystem.emsschedulingservice.scheduling.entity.ShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment,Long>
{
    List<ShiftAssignment> findByShiftId(Long shiftId);
    List<ShiftAssignment> findByEmployeeId(Long employeeId);
    boolean existsByShiftIdAndEmployeeId(Long shiftId,Long employeeId);
}
