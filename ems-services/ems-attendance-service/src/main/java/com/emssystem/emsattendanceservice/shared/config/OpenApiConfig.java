package com.emssystem.emsattendanceservice.shared.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * File: OpenApiConfig.java
 * Purpose: Configures documentation for the REST api
 * using Springdoc OpenAPI and Swagger UI.
 * It defines:
 * - API name and description
 * - API version
 * - Contact or license information
 * - General API metadata
 */

@Configuration(proxyBeanMethods = false)
public class OpenApiConfig {
        @Bean
        public OpenAPI employeeManagementOpenAPI() {
                return new OpenAPI()
                                .info(new Info()
                                                .title("Employee Management System API")
                                                .description("""
                                                                REST API for managing employees, attendance,
                                                                schedules, PTO requests and payroll records.
                                                                """)
                                                .version("1.0.0")
                                                .contact(new Contact()
                                                                .name("EMS Development Team")));
        }

        @Bean
        public OpenAPI attendanceManagementOpenAPI() {
                return new OpenAPI()
                                .info(new Info()
                                                .title("Attendance Management API")
                                                .description("""
                                                                REST API for managing employee attendance,
                                                                including clock-in/out, leave requests, and
                                                                attendance reports.
                                                                """)
                                                .version("1.0.0")
                                                .contact(new Contact()
                                                                .name("EMS Development Team")));
        }

        @Bean
        public OpenAPI payrollManagementOpenAPI() {
                return new OpenAPI()
                                .info(new Info()
                                                .title("Payroll Management API")
                                                .description("""
                                                                REST API for managing employee payroll,
                                                                including salary calculations, deductions,
                                                                and generating payslips.
                                                                """)
                                                .version("1.0.0")
                                                .contact(new Contact()
                                                                .name("EMS Development Team")));
        }

        @Bean
        public OpenAPI leaveManagementOpenAPI() {
                return new OpenAPI()
                                .info(new Info()
                                                .title("Leave Management API")
                                                .description("""
                                                                REST API for managing employee leave requests,
                                                                approvals, and leave balances.
                                                                """)
                                                .version("1.0.0")
                                                .contact(new Contact()
                                                                .name("EMS Development Team")));
        }

        @Bean
        public OpenAPI scheduleManagementOpenAPI() {
                return new OpenAPI()
                                .info(new Info()
                                                .title("Schedule Management API")
                                                .description("""
                                                                REST API for managing employee schedules,
                                                                including shift assignments, schedule changes,
                                                                and notifications.
                                                                """)
                                                .version("1.0.0")
                                                .contact(new Contact()
                                                                .name("EMS Development Team")));
        }

        @Bean
        public OpenAPI reportingManagementOpenAPI() {
                return new OpenAPI()
                                .info(new Info()
                                                .title("Reporting Management API")
                                                .description("""
                                                                REST API for generating various reports related
                                                                to employees, attendance, payroll, and leave.
                                                                """)
                                                .version("1.0.0")
                                                .contact(new Contact()
                                                                .name("EMS Development Team")));
        }

        @Bean
        public OpenAPI notificationManagementOpenAPI() {
                return new OpenAPI()
                                .info(new Info()
                                                .title("Notification Management API")
                                                .description("""
                                                                REST API for managing notifications related to
                                                                employee activities, attendance, payroll, and leave.
                                                                """)
                                                .version("1.0.0")
                                                .contact(new Contact()
                                                                .name("EMS Development Team")));
        }

        @Bean
        public OpenAPI authenticationManagementOpenAPI() {
                return new OpenAPI()
                                .info(new Info()
                                                .title("Authentication Management API")
                                                .description("""
                                                                REST API for managing user authentication,
                                                                including login, registration, and password
                                                                management.
                                                                """)
                                                .version("1.0.0")
                                                .contact(new Contact()
                                                                .name("EMS Development Team")));
        }

        @Bean
        public OpenAPI authorizationManagementOpenAPI() {
                return new OpenAPI()
                                .info(new Info()
                                                .title("Authorization Management API")
                                                .description("""
                                                                REST API for managing user authorization,
                                                                including roles, permissions, and access control.
                                                                """)
                                                .version("1.0.0")
                                                .contact(new Contact()
                                                                .name("EMS Development Team")));
        }

        @Bean
        public OpenAPI userProfileManagementOpenAPI() {
                return new OpenAPI()
                                .info(new Info()
                                                .title("User Profile Management API")
                                                .description("""
                                                                REST API for managing user profiles,
                                                                including personal information, preferences,
                                                                and profile settings.
                                                                """)
                                                .version("1.0.0")
                                                .contact(new Contact()
                                                                .name("EMS Development Team")));
        }

}
