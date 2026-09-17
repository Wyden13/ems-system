package com.emssystem.emsauthservice.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.Clock;

/**
 * File: ClockConfig.java
 * Purpose: To keep time handling consistent and make time zones explicit
 */

@Configuration
public class ClockConfig {
    @Bean
    public Clock clock(){
        return Clock.systemUTC();
    }
}
