package com.emssystem.emsnotificationservice.notification.dto; import com.emssystem.emsnotificationservice.notification.enums.NotificationType; import java.time.Instant;
public record NotificationResponse(Long id,Long employeeId,NotificationType type,String title,String body,Instant readAt,Instant createdAt) {}
