package com.emssystem.emsnotificationservice.notification.event; import java.time.Instant; import java.util.UUID;
public record PtoReviewedEvent(UUID eventId,Instant occurredAt,Long employeeId,Long requestId,String decision) {}
