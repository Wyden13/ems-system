package com.emssystem.ems.organization.entity;

import jakarta.persistence.*;

@Entity
@Table(name="departments")
public class Department {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long Id;

    @Column(name="department_name",nullable = false,unique = true)
    private String departmentName;

    @Column(name="location_id",nullable = false)
    private Location location;

    public Department(){}

    public Department(String departmentName, Location location){
        this.departmentName = departmentName;
        this.location = location;
    }
}
