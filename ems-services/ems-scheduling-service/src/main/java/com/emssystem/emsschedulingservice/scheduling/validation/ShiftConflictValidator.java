package com.emssystem.emsschedulingservice.scheduling.validation;
import com.emssystem.emsschedulingservice.scheduling.dto.response.ShiftConflictResponse;
import java.time.Instant; import java.util.List;
public interface ShiftConflictValidator{
    List<ShiftConflictResponse> findConflicts(Long employeeId,Instant startsAt,Instant endsAt);
}
