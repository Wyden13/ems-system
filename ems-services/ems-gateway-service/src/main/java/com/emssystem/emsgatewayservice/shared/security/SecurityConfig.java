package com.emssystem.emsgatewayservice.shared.security;

import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;
import java.util.*;

@Configuration
@org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        var authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("role");
        authorities.setAuthorityPrefix("ROLE_");
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationConverter converter,
            @Value("${app.session.secure-cookie:true}") boolean secureCookie) throws Exception {
        http.csrf(csrf -> csrf.disable());
        http.cors(cors -> {
        }).sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(form -> form.disable()).httpBasic(basic -> basic.disable())
                .logout(logout -> logout.disable())
                .authorizeHttpRequests(requests -> requests
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/error").permitAll()
                        .requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout",
                                "/api/v1/auth/csrf")
                        .permitAll()
                        .requestMatchers("/api/v1/accounts/**", "/api/time-entries", "/api/time-entries/**", "/api/timesheets/**", "/api/payroll/estimates",
                                "/api/shifts", "/api/shifts/**", "/api/shift-categories", "/api/shift-categories/**",
                                "/api/shift-assignments/**", "/api/availability", "/api/availability/**", "/api/pto/**").authenticated()
                        .requestMatchers("/api/v1/admin/**", "/api/employees", "/api/employees/**", "/api/departments",
                                "/api/departments/**", "/api/locations", "/api/locations/**")
                        .hasRole("ADMIN")
                        .anyRequest().denyAll())
                .oauth2ResourceServer(server -> server.jwt(jwt -> jwt.jwtAuthenticationConverter(converter)))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((req, res, ex) -> {
                            res.setStatus(401);
                            res.setContentType("application/json");
                            res.getWriter()
                                    .write("{\"code\":\"UNAUTHORIZED\",\"message\":\"Authentication required\"}");
                        })
                        .accessDeniedHandler((req, res, ex) -> {
                            res.setStatus(403);
                            res.setContentType("application/json");
                            res.getWriter().write(
                                    "{\"code\":\"FORBIDDEN\",\"message\":\"Access denied or invalid CSRF token\"}");
                        }));
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.security.allowed-origins:http://localhost:5173}") String origins) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-XSRF-TOKEN"));
        config.setExposedHeaders(List.of("Location"));
        config.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
