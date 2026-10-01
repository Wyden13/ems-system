package com.emssystem.emsorganizationservice.organization.entity;

import com.emssystem.emsorganizationservice.shared.entity.AuditableEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "locations", uniqueConstraints = @UniqueConstraint(name = "uk_location_name", columnNames = "name"))
public class Location extends AuditableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    protected Location() {
    }

    public Location(String name) {
        this.name = name;
    }

    public void rename(String name) {
        this.name = name;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }
}
