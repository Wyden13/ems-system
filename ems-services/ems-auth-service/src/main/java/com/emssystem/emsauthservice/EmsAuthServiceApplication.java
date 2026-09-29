package com.emssystem.emsauthservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class EmsAuthServiceApplication {

    public static void main(String[] args) {
        var context = SpringApplication.run(EmsAuthServiceApplication.class, args);
        if (context.getEnvironment().acceptsProfiles(org.springframework.core.env.Profiles.of("bootstrap"))) context.close();
    }

}
