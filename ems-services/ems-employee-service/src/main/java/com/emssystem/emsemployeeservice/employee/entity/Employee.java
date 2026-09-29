package com.emssystem.emsemployeeservice.employee.entity;

import com.emssystem.emsemployeeservice.shared.entity.AuditableEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "employees", uniqueConstraints = {
        @UniqueConstraint(name = "uk_employee_number", columnNames = "employee_number"),
        @UniqueConstraint(name = "uk_employee_email", columnNames = "email"),
        @UniqueConstraint(name = "uk_employee_account", columnNames = "user_account_id")
})
public class Employee extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_number", nullable = false, length = 40)
    private String employeeNumber;

    @Column(name = "first_name", nullable = false, length = 50)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 50)
    private String lastName;

    @Column(nullable = false, length = 320)
    private String email;

    @Column(name = "contact_number", length = 40)
    private String phoneNumber;

    @Column(length = 500)
    private String address;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "hire_date", nullable = false)
    private LocalDate hireDate;

    @Column(name = "department_id", nullable = false)
    private Long departmentId;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private EmployeeRole role;

    @Column(name = "user_account_id")
    private UUID userAccountId;

    @Column(name = "pay_rate", nullable = false, precision = 19, scale = 2)
    private BigDecimal payRate;

    @Column(name = "job_title", length = 100)
    private String jobTitle;

    @Column(nullable = false)
    private boolean active = true;

    protected Employee() {}

    public Employee(String employeeNumber, String firstName, String lastName, String email,
                    String phoneNumber, String address, LocalDate birthDate, LocalDate hireDate,
                    Long departmentId, EmployeeRole role, UUID userAccountId,
                    BigDecimal payRate, String jobTitle) {
        this.employeeNumber = employeeNumber;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.address = address;
        this.birthDate = birthDate;
        this.hireDate = hireDate;
        this.departmentId = departmentId;
        this.role = role;
        this.userAccountId = userAccountId;
        this.payRate = payRate;
        this.jobTitle = jobTitle;
    }

    public Long getId() { return id; }
    public String getEmployeeNumber() { return employeeNumber; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getEmail() { return email; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getAddress() { return address; }
    public LocalDate getBirthDate() { return birthDate; }
    public LocalDate getHireDate() { return hireDate; }
    public Long getDepartmentId() { return departmentId; }
    public EmployeeRole getRole() { return role; }
    public UUID getUserAccountId() { return userAccountId; }
    public BigDecimal getPayRate() { return payRate; }
    public String getJobTitle() { return jobTitle; }
    public boolean isActive() { return active; }

    public void changeEmail(String email){
        this.email = email;
    }
    public void changeAddress (String address){
        this.address = address;
    }
    public void changeBirthday(LocalDate birthday){
        this.birthDate = birthday;
    }
    public void changeHireDate(LocalDate date){
        this.hireDate = date;
    }
    public void changeRole(EmployeeRole role){
        this.role = role;
    }
    public void changePayRate(BigDecimal rate){
        this.payRate = rate;
    }
    public void changeJobTitle(String title){
        this.jobTitle = title;
    }
    public void changeStatus(boolean status){
        this.active = status;
    }

    public void replaceDetails(String employeeNumber, String firstName, String lastName,
                               String email, String phoneNumber, String address,
                               LocalDate birthDate, LocalDate hireDate, Long departmentId,
                               EmployeeRole role, UUID userAccountId, BigDecimal payRate,
                               String jobTitle) {
        this.employeeNumber = employeeNumber;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.address = address;
        this.birthDate = birthDate;
        this.hireDate = hireDate;
        this.departmentId = departmentId;
        this.role = role;
        this.userAccountId = userAccountId;
        this.payRate = payRate;
        this.jobTitle = jobTitle;
    }

    public void activate() {
        this.active = true;
    }

    public void deactivate() {
        this.active = false;
    }

}
