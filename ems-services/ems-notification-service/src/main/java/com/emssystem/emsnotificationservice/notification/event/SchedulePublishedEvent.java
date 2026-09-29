package com.emssystem.emsnotificationservice.notification.event; import java.time.*; import java.util.*;
public record SchedulePublishedEvent(UUID eventId,Instant occurredAt,LocalDate from,LocalDate to,List<Long> employeeIds){public SchedulePublishedEvent{employeeIds=List.copyOf(employeeIds);}}
