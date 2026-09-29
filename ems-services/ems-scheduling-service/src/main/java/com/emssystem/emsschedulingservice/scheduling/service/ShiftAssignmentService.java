package com.emssystem.emsschedulingservice.scheduling.service;
import com.emssystem.emsschedulingservice.scheduling.dto.request.*; import com.emssystem.emsschedulingservice.scheduling.dto.response.ShiftAssignmentResponse; import java.util.UUID;
public interface ShiftAssignmentService{ShiftAssignmentResponse assign(Long shiftId,AssignEmployeeRequest request);ShiftAssignmentResponse respond(UUID accountId,Long shiftId,RespondToAssignmentRequest request);ShiftAssignmentResponse cancel(Long assignmentId);}
