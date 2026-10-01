package com.emssystem.emsorganizationservice.organization.entity;

import com.emssystem.emsorganizationservice.shared.entity.AuditableEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "departments", uniqueConstraints = @UniqueConstraint(name = "uk_department_name", columnNames = "department_name"))
public class Department extends AuditableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "department_name", nullable = false, length = 100)
    private String departmentName;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    @Column(nullable = false)
    private boolean archived;

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }

    protected Department() {
    }

    public Department(String departmentName, Location location) {
        this.departmentName = departmentName;
        this.location = location;
    }

    public void replaceDetails(String departmentName, Location location) {
        this.departmentName = departmentName;
        this.location = location;
    }

    public Long getId() {
        return id;
    }

    public String getDepartmentName() {
        return departmentName;
    }

    public Location getLocation() {
        return location;
    }
}
