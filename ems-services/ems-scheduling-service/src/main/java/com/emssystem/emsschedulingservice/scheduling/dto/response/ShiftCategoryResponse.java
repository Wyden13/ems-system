package com.emssystem.emsschedulingservice.scheduling.dto.response;
import java.time.LocalTime;
public record ShiftCategoryResponse(Long id,String name,String color,LocalTime defaultStartTime,LocalTime defaultEndTime,boolean active) {}
