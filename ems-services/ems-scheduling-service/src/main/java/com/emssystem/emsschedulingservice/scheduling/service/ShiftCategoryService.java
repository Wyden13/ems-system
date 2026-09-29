package com.emssystem.emsschedulingservice.scheduling.service;
import com.emssystem.emsschedulingservice.scheduling.dto.request.UpsertShiftCategoryRequest; import com.emssystem.emsschedulingservice.scheduling.dto.response.ShiftCategoryResponse; import java.util.List;
public interface ShiftCategoryService{ShiftCategoryResponse create(UpsertShiftCategoryRequest request);ShiftCategoryResponse get(Long id);List<ShiftCategoryResponse> list();ShiftCategoryResponse replace(Long id,UpsertShiftCategoryRequest request);ShiftCategoryResponse activate(Long id);ShiftCategoryResponse deactivate(Long id);}
