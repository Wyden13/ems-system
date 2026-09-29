package com.emssystem.emsschedulingservice.scheduling.repository;
import com.emssystem.emsschedulingservice.scheduling.entity.EmployeeAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.DayOfWeek; import java.util.List;
public interface EmployeeAvailabilityRepository extends JpaRepository<EmployeeAvailability,Long>
{
    List<EmployeeAvailability> findByEmployeeId(Long employeeId);
    List<EmployeeAvailability> findByEmployeeIdAndDayOfWeek(Long employeeId,DayOfWeek day);
}
