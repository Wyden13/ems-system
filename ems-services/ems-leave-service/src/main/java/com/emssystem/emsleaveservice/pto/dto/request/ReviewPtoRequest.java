package com.emssystem.emsleaveservice.pto.dto.request; import com.emssystem.emsleaveservice.pto.enums.PtoRequestStatus; import jakarta.validation.constraints.*;
public record ReviewPtoRequest(@NotNull PtoRequestStatus decision,@Size(max=500) String comment) {}
