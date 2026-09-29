package com.emssystem.emsschedulingservice.scheduling.mapper;
import com.emssystem.emsschedulingservice.scheduling.dto.response.*;
import com.emssystem.emsschedulingservice.scheduling.entity.*;
import java.util.List;
public final class ShiftMapper{
 private ShiftMapper(){}
 public static ShiftAssignmentResponse toResponse(ShiftAssignment a){
  return new ShiftAssignmentResponse(
          a.getId(),
          a.getShift().getId(),
          a.getEmployeeId(),
          a.getStatus(),
          a.getRespondedAt());
 }
 public static ShiftResponse toResponse(Shift s,List<ShiftAssignment> assignments)
 {return new ShiftResponse(
         s.getId(),
         s.getShiftCategory().getId(),
         s.getShiftCategory().getName(),
         s.getShiftCategory().getColor(),
         s.getStartsAt(),s.getEndsAt(),
         s.getStatus(),s.getLocationId(),
         s.getRequiredEmployees(),
         assignments.stream().map(ShiftMapper::toResponse).toList());
 }}
