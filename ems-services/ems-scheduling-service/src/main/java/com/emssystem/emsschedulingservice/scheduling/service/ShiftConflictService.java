package com.emssystem.emsschedulingservice.scheduling.service;
import com.emssystem.emsschedulingservice.scheduling.dto.response.ShiftConflictResponse; import java.time.Instant; import java.util.List;
public interface ShiftConflictService{List<ShiftConflictResponse> find(Long employeeId,Instant startsAt,Instant endsAt);}
