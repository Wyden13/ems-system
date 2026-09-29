package com.emssystem.emsschedulingservice.scheduling.mapper;
import com.emssystem.emsschedulingservice.scheduling.dto.response.ShiftCategoryResponse;
import com.emssystem.emsschedulingservice.scheduling.entity.ShiftCategory;
public final class ShiftCategoryMapper{
    private ShiftCategoryMapper(){} public static ShiftCategoryResponse toResponse(ShiftCategory c){
        return new ShiftCategoryResponse(
                c.getId(),
                c.getName(),
                c.getColor(),
                c.getDefaultStartTime(),
                c.getDefaultEndTime(),
                c.isActive());
    }
}
