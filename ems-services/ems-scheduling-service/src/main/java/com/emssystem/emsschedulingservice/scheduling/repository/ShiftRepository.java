package com.emssystem.emsschedulingservice.scheduling.repository;
import com.emssystem.emsschedulingservice.scheduling.entity.Shift;
import com.emssystem.emsschedulingservice.scheduling.enums.ShiftStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant; import java.util.List;
public interface ShiftRepository extends JpaRepository<Shift,Long>{
    List<Shift> findByStartsAtBetween(Instant from,Instant to);
    List<Shift> findByStatusAndStartsAtBetween(ShiftStatus status,Instant from,Instant to);
}
