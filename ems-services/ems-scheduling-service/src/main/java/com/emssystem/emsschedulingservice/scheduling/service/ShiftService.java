package com.emssystem.emsschedulingservice.scheduling.service;
import com.emssystem.emsschedulingservice.scheduling.dto.request.*; import com.emssystem.emsschedulingservice.scheduling.dto.response.*;
import java.time.Instant; import java.util.List;
public interface ShiftService{ShiftResponse create(CreateShiftRequest request);ShiftResponse get(Long id);List<ShiftResponse> list(Instant from,Instant to);ShiftResponse replace(Long id,UpdateShiftRequest request);List<ShiftResponse> publish(PublishShiftRequest request);ShiftResponse cancel(Long id);ShiftSummaryResponse summary(Instant from,Instant to);}
