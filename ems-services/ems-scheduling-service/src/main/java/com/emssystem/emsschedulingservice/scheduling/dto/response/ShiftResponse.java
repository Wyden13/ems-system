package com.emssystem.emsschedulingservice.scheduling.dto.response;
import com.emssystem.emsschedulingservice.scheduling.enums.ShiftStatus;
import java.time.Instant;
import java.util.List;
public record ShiftResponse(Long id,Long categoryId,String categoryName,String color,Instant startsAt,Instant endsAt,ShiftStatus status,
        Long locationId,int requiredEmployees,List<ShiftAssignmentResponse> assignments){public ShiftResponse{assignments=List.copyOf(assignments);}}
