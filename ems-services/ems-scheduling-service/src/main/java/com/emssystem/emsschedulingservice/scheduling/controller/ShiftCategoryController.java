package com.emssystem.emsschedulingservice.scheduling.controller;

import com.emssystem.emsschedulingservice.scheduling.dto.request.UpsertShiftCategoryRequest;
import com.emssystem.emsschedulingservice.scheduling.dto.response.ShiftCategoryResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RequestMapping("/api/shift-categories")
public interface ShiftCategoryController {
    @PostMapping
    ShiftCategoryResponse create(@Valid @RequestBody UpsertShiftCategoryRequest request);

    @GetMapping("/{id}")
    ShiftCategoryResponse get(@PathVariable Long id);

    @GetMapping
    List<ShiftCategoryResponse> list();

    @PutMapping("/{id}")
    ShiftCategoryResponse replace(@PathVariable Long id, @Valid @RequestBody UpsertShiftCategoryRequest request);

    @PostMapping("/{id}/activate")
    ShiftCategoryResponse activate(@PathVariable Long id);

    @PostMapping("/{id}/deactivate")
    ShiftCategoryResponse deactivate(@PathVariable Long id);
}
