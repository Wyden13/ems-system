package com.emssystem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.FullyQualifiedAnnotationBeanNameGenerator;

@SpringBootApplication(scanBasePackages = { "com.emssystem.emsemployeeservice", "com.emssystem.emsorganizationservice",
        "com.emssystem.emspeopleservice" }, nameGenerator = FullyQualifiedAnnotationBeanNameGenerator.class)
public class EmsPeopleServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(EmsPeopleServiceApplication.class, args);
    }
}
