package com.emssystem.emsschedulingservice.shared.entity;

import com.emssystem.ems.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Version;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Clock;

@MappedSuperclass
@EntityListeners(AuditingEntityListener.class) // Required for auto-population
public abstract class AuditableEntity {
    @CreatedDate
    @Column(name="created_at",nullable = false,updatable=false)
    private Clock createdAt;

    @LastModifiedDate
    @Column(name="last_modified_at",nullable = false,updatable=true)
    private Clock updatedAt;

    @CreatedBy
    @Column(name="created_by",updatable=false)
    private User createdBy;

    @LastModifiedBy
    @Column(name="last_modified_by",updatable=false)
    private User updatedBy;

    @Version
    private Long version;
}
