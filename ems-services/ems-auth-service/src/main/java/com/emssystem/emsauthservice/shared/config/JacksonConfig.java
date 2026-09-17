// src/main/java/com.emssystem.ems/shared/config/JacksonConfig
package com.emssystem.emsauthservice.shared.config;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.cfg.DateTimeFeature;

/**
 * File: JacksonConfig.java
 * Purpose: Using a library named Jackson 3 to handle JSON data;
 * Serializes and deserializes the conversion between Java objects and JSON
 */

@Configuration(proxyBeanMethods = false)
public class JacksonConfig {
    @Bean
    public JsonMapperBuilderCustomizer jsonMapperCustomizer(){
        return builder ->builder

                // Serialize dates as ISO_8601 strings.
                .disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)

                // Ignore additional JSON properties from the client.
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)

                // Exclude null properties from JSON responses.
                .changeDefaultPropertyInclusion(
                        inclusion -> inclusion.withValueInclusion(JsonInclude.Include.NON_NULL)
                );

    }

}
