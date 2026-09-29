package com.emssystem.emsnotificationservice.notification.repository; import com.emssystem.emsnotificationservice.notification.entity.Notification; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface NotificationRepository extends JpaRepository<Notification,Long>{
    List<Notification> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);long countByEmployeeIdAndReadAtIsNull(Long employeeId);}
