package com.emssystem.emsemployeeservice.employee.entity;
import com.emssystem.ems.organization.entity.Department;
import com.emssystem.ems.user.entity.Role;
import jakarta.persistence.*;

import java.time.LocalTime;
import java.util.Date;

@Entity
@Table(name="employees")
public class Employee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="employee_number",nullable = false)
    private String employeeNumber;

    @Column(name="first_name",length = 50, nullable = false)
    private String firstName;

    @Column(name="last_name",length = 50, nullable = false)
    private String lastName;

    @Column(name = "email", nullable = false,unique = true)
    private String email;

    @Column(name= "contact_number", nullable = false,unique = true)
    private String phoneNumber;

    @Column(name= "address",nullable = false)
    private String address;

    @Column(name = "birthday",nullable = false, unique=false)
    private Date birthDate;

    @Column(name="hire_date",nullable = false)
    private LocalTime hireDate = LocalTime.now();

    @Column(name="department_id")
    private Department department;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "status", nullable = false)
    private boolean active=true;


    protected Employee(){}
    public Employee(
            String firstName,
            String lastName,
            String email,
            String phoneNumber,
            Date birthday,
            String address,
            Role role
    ){
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.address = address;
        this.birthDate = birthday;
        this.role = role;
    }

    public Long getId() {
        return id;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public String getAddress() {
        return address;
    }

    public Date getBirthDate() {
        return birthDate;
    }

    public Role getRole() {
        return role;
    }

    public boolean isActive() {
        return active;
    }
    public void deactive(){
        this.active = false;
    }
}
