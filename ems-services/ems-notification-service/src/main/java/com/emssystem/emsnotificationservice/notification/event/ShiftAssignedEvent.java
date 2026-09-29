package com.emssystem.emsnotificationservice.notification.event; import java.time.Instant; import java.util.UUID;
public record ShiftAssignedEvent(UUID eventId,Instant occurredAt,Long employeeId,Long shiftId,Instant startsAt,Instant endsAt) {}
