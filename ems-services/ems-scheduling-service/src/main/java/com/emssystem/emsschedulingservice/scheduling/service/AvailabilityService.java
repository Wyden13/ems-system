package com.emssystem.emsschedulingservice.scheduling.service;
import com.emssystem.emsschedulingservice.scheduling.dto.request.CreateAvailabilityRequest; import com.emssystem.emsschedulingservice.scheduling.dto.response.AvailabilityResponse; import java.util.*;
public interface AvailabilityService{AvailabilityResponse create(UUID accountId,CreateAvailabilityRequest request);List<AvailabilityResponse> mine(UUID accountId);AvailabilityResponse replace(UUID accountId,Long id,CreateAvailabilityRequest request);void delete(UUID accountId,Long id);}
