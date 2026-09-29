package com.emssystem.emsleaveservice.pto.dto.request; import jakarta.validation.constraints.Size; public record CancelPtoRequest(@Size(max=500) String reason) {}
