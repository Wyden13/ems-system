package com.emssystem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.FullyQualifiedAnnotationBeanNameGenerator;

@SpringBootApplication(scanBasePackages = { "com.emssystem.emsschedulingservice", "com.emssystem.emsleaveservice",
        "com.emssystem.emsattendanceservice", "com.emssystem.emspayrollservice",
        "com.emssystem.emsworkforceservice" }, nameGenerator = FullyQualifiedAnnotationBeanNameGenerator.class)
public class EmsWorkforceServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(EmsWorkforceServiceApplication.class, args);
    }
}
