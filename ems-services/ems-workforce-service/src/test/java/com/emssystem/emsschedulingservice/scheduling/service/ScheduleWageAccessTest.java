package com.emssystem.emsschedulingservice.scheduling.service;

import com.emssystem.emsschedulingservice.shared.grpc.*;
import com.emssystem.contracts.workforce.v1.EmployeeInfo;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import java.time.Instant;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ScheduleWageAccessTest {
    final UUID account = UUID.randomUUID();
    final Instant from = Instant.parse("2026-10-03T06:00:00Z"), to = Instant.parse("2026-10-10T06:00:00Z");
    WorkforceClient people;
    SchedulingOperations service;
    @BeforeEach void setup() {
        var db = mock(JdbcTemplate.class);
        doReturn(List.of()).when(db).query(anyString(), org.mockito.ArgumentMatchers.<RowMapper<Map<String,Object>>>any(), any(Object[].class));
        people = mock(WorkforceClient.class);
        service = spy(new SchedulingOperations(db, people, mock(OrganizationClient.class)));
        doReturn(List.of()).when(service).list(from,to);
        when(people.byAccount(account)).thenReturn(person(1,"18.75"));
        when(people.list(0)).thenReturn(List.of(person(1,"18.75"), person(2,"34.00")));
    }
    EmployeeInfo person(long id,String rate) {return EmployeeInfo.newBuilder().setEmployeeId(id).setHourlyRate(rate).setAccountId(account.toString()).build();}
    void caller(String role) {SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(Jwt.withTokenValue("test").header("alg","none").subject(account.toString()).claim("role",role).build()));}
    @AfterEach void clear() {SecurityContextHolder.clearContext();}
    @Test void supervisorsReceiveOnlyOwnRate() {
        caller("SUPERVISOR");
        var response=service.wageEstimates(from,to);
        assertEquals(1,((List<?>)response.get("estimates")).size());
        verify(people,never()).list(anyLong());
    }
    @Test void employeesReceiveOnlyOwnRate() {
        caller("EMPLOYEE");
        assertEquals(1,((List<?>)service.wageEstimates(from,to).get("estimates")).size());
        verify(people,never()).list(anyLong());
    }
    @Test void managersReceiveTeamRates() {
        caller("MANAGER");
        assertEquals(2,((List<?>)service.wageEstimates(from,to).get("estimates")).size());
    }
    @Test void adminsReceiveTeamRates() {
        caller("ADMIN");
        assertEquals(2,((List<?>)service.wageEstimates(from,to).get("estimates")).size());
    }
    @Test void clipsOvernightHoursAndRoundsBasePayOnce() {
        assertEquals(7200, SchedulingOperations.clippedSeconds(from.minusSeconds(21600),from.plusSeconds(7200),from,to));
        assertEquals(0, SchedulingOperations.clippedSeconds(from.minusSeconds(3600),from,from,to));
        assertEquals(new BigDecimal("150.00"), SchedulingOperations.basePay(28800,new BigDecimal("18.75")));
        assertEquals(new BigDecimal("0.01"), SchedulingOperations.basePay(1,new BigDecimal("18.75")));
    }
}
