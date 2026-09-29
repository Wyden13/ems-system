package com.emssystem.emsattendanceservice.attendance.repository;
import com.emssystem.emsattendanceservice.attendance.entity.TimeEntryAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface TimeEntryAdjustmentRepository extends JpaRepository<TimeEntryAdjustment,Long>{List<TimeEntryAdjustment> findByTimeEntryIdOrderByAdjustedAt(Long id);}
