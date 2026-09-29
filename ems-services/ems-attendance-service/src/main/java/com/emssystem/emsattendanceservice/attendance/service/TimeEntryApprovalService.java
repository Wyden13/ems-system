package com.emssystem.emsattendanceservice.attendance.service;
import com.emssystem.emsattendanceservice.attendance.dto.request.*;
import com.emssystem.emsattendanceservice.attendance.dto.response.TimeEntryResponse;
import java.util.UUID;
public interface TimeEntryApprovalService { TimeEntryResponse approve(Long id,UUID reviewer,ApproveTimeEntryRequest request); TimeEntryResponse reject(Long id,UUID reviewer,ApproveTimeEntryRequest request); TimeEntryResponse adjust(Long id,UUID reviewer,AdjustTimeEntryRequest request); }
