package com.emssystem.emsschedulingservice.scheduling.dto.response;
public record ShiftSummaryResponse(long draft,long published,long cancelled,long assignments,long unfilledPositions) {}
