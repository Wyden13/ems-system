package com.emssystem;

import com.emssystem.emsleaveservice.pto.service.LeaveOperations;
import com.emssystem.emsleaveservice.pto.controller.LeaveApi.*;
import com.emssystem.emsleaveservice.pto.dto.request.UpsertPtoTypeRequest;
import com.emssystem.emsschedulingservice.scheduling.service.SchedulingOperations;
import com.emssystem.emsschedulingservice.scheduling.controller.SchedulingApi.ShiftInput;
import com.emssystem.emsschedulingservice.scheduling.dto.request.UpsertShiftCategoryRequest;
import com.emssystem.emsschedulingservice.shared.grpc.*;
import com.emssystem.emspayrollservice.shared.grpc.AttendanceClient;
import com.emssystem.emsattendanceservice.attendance.scheduling.ScheduleProvider;
import com.emssystem.contracts.workforce.v1.EmployeeInfo;
import com.emssystem.contracts.v1.DepartmentReference;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;
import org.testcontainers.postgresql.PostgreSQLContainer;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(classes=EmsWorkforceServiceApplication.class)
class WorkforceConsolidationPostgresTest {
    static final PostgreSQLContainer DB=new PostgreSQLContainer("postgres:18-alpine");
    @DynamicPropertySource static void database(DynamicPropertyRegistry r){DB.start();r.add("spring.datasource.url",DB::getJdbcUrl);r.add("spring.datasource.username",DB::getUsername);r.add("spring.datasource.password",DB::getPassword);}
    @AfterAll static void stop(){DB.stop();}
    @Autowired JdbcTemplate db;
    @Autowired LeaveOperations leave;
    @Autowired SchedulingOperations scheduling;
    @Autowired ScheduleProvider schedules;
    @Autowired AttendanceClient attendance;
    @MockitoBean WorkforceClient people;
    @MockitoBean OrganizationClient organization;
    final UUID worker=UUID.fromString("00000000-0000-0000-0000-000000000001"),manager=UUID.fromString("00000000-0000-0000-0000-000000000002");
    final LocalDate day=LocalDate.now(ZoneId.of("America/Edmonton")).plusDays(3);
    long type,category;
    void login(UUID account,String role){var jwt=Jwt.withTokenValue("test").header("alg","HS256").subject(account.toString()).claim("role",role).build();SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));}
    EmployeeInfo person(long id,UUID account){return EmployeeInfo.newBuilder().setEmployeeId(id).setAccountId(account.toString()).setDepartmentId(10).setName("Person "+id).setActive(true).setHourlyRate("20").build();}
    @BeforeEach void setup(){
        db.execute("drop trigger if exists fail_usage on pto_ledger_entries");
        db.execute("drop function if exists injected_failure()");
        db.execute("truncate pto_types,pto_balances,pto_requests,pto_ledger_entries,pto_audits,leave_holds,shift_categories,shifts,shift_assignments,employee_availability,time_entries,time_entry_adjustments,attendance_audits restart identity cascade");
        when(people.byId(1)).thenReturn(person(1,worker));when(people.byAccount(worker)).thenReturn(person(1,worker));when(people.byAccount(manager)).thenReturn(person(2,manager));when(people.list(0)).thenReturn(List.of(person(1,worker),person(2,manager)));
        when(organization.departments()).thenReturn(List.of(DepartmentReference.newBuilder().setDepartmentId(10).setLocationId(1).build()));
        login(manager,"ADMIN");
        type=((Number)leave.type(null,new UpsertPtoTypeRequest("Vacation",BigDecimal.ZERO,BigDecimal.ZERO,true)).get("id")).longValue();
        leave.adjust(new Adjustment(UUID.randomUUID(),1L,type,new BigDecimal("16"),"Opening mock balance"));
        category=((Number)scheduling.category(null,new UpsertShiftCategoryRequest("Day","#abcdef",LocalTime.of(9,0),LocalTime.of(17,0))).get("id")).longValue();
    }
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    long request(){login(worker,"EMPLOYEE");return ((Number)leave.create(new Request(UUID.randomUUID(),type,day,day,new BigDecimal("8"))).get("id")).longValue();}
    long shift(){login(manager,"ADMIN");Instant start=day.atTime(9,0).atZone(ZoneId.of("America/Edmonton")).toInstant();return ((Number)scheduling.save(null,new ShiftInput(category,10L,1L,start,start.plusSeconds(28800),1,null)).get("id")).longValue();}
    @Test void balanceFailureRollsBackHoldStatusAndAuditsTogether(){
        long request=request();login(manager,"ADMIN");
        db.execute("create function injected_failure() returns trigger language plpgsql as $$ begin if NEW.entry_type='USAGE' then raise exception 'Injected ledger failure'; end if; return NEW; end $$");
        db.execute("create trigger fail_usage before insert on pto_ledger_entries for each row execute function injected_failure()");
        assertThrows(RuntimeException.class,()->leave.review(request,new Decision(0L,"APPROVED","Test rollback")));
        assertEquals("PENDING",db.queryForObject("select status from pto_requests where id=?",String.class,request));
        assertEquals(0L,db.queryForObject("select count(*) from leave_holds",Long.class));
        assertEquals(new BigDecimal("8.00"),db.queryForObject("select reserved_hours from pto_balances",BigDecimal.class));
        assertEquals(BigDecimal.ZERO.setScale(2),db.queryForObject("select used_hours from pto_balances",BigDecimal.class));
        assertEquals(List.of("REQUEST"),db.queryForList("select action from pto_audits where request_id=? order by id",String.class,request));
    }
    @Test void approveCancelAndAssignUseTheSameDatabase(){
        long request=request(),shift=shift();
        assertEquals("APPROVED",leave.review(request,new Decision(0L,"APPROVED","Approved")).get("status"));
        assertEquals(1L,db.queryForObject("select count(*) from leave_holds",Long.class));
        assertThrows(ResponseStatusException.class,()->scheduling.assign(shift,1,0L));
        var current=leave.get(request);leave.cancel(request,new Cancel(((Number)current.get("version")).longValue(),"Cancelled"));
        assertEquals(0L,db.queryForObject("select count(*) from leave_holds",Long.class));
        scheduling.assign(shift,1,0L);
        assertEquals(new BigDecimal("0.00"),db.queryForObject("select used_hours from pto_balances",BigDecimal.class));
    }
    @Test void concurrentAssignmentAndApprovalHaveExactlyOneWinner() throws Exception {
        long request=request(),shift=shift();var gate=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
        try {
            var approval=pool.submit(()->{login(manager,"ADMIN");gate.await();try{leave.review(request,new Decision(0L,"APPROVED","Concurrent"));return true;}catch(ResponseStatusException e){return false;}finally{clear();}});
            var assignment=pool.submit(()->{login(manager,"ADMIN");gate.await();try{scheduling.assign(shift,1,0L);return true;}catch(ResponseStatusException e){return false;}finally{clear();}});
            gate.countDown();assertNotEquals(approval.get(15,TimeUnit.SECONDS),assignment.get(15,TimeUnit.SECONDS));
            assertEquals(1L,db.queryForObject("select (select count(*) from leave_holds)+(select count(*) from shift_assignments where status='ASSIGNED')",Long.class));
        } finally {pool.shutdownNow();}
    }
    @Test void scheduleProviderReadsPublishedActiveAssignmentsAndBulkAttendanceIsScoped(){
        long shift=shift();scheduling.assign(shift,1,0L);scheduling.publish(shift,1L);
        Instant start=day.atStartOfDay(ZoneId.of("America/Edmonton")).toInstant(),end=start.plusSeconds(86400);
        assertEquals(1,schedules.assignedShifts(1,start,end).orElseThrow().size());
        assertTrue(schedules.assignedShifts(2,start,end).orElseThrow().isEmpty());
        scheduling.cancel(shift,2L);assertTrue(schedules.assignedShifts(1,start,end).orElseThrow().isEmpty());
        db.update("insert into time_entries(employee_id,clock_in,clock_out,status,source) values (1,?,?,'APPROVED','WEB'),(2,?,?,'PENDING_APPROVAL','WEB'),(3,?,?,'APPROVED','WEB')",java.sql.Timestamp.from(start),java.sql.Timestamp.from(end),java.sql.Timestamp.from(start),java.sql.Timestamp.from(end),java.sql.Timestamp.from(start),java.sql.Timestamp.from(end));
        var grouped=attendance.entriesByEmployee(List.of(1L,2L),start,end);
        assertEquals(Set.of(1L,2L),grouped.keySet());assertEquals("APPROVED",grouped.get(1L).get(0).getStatus());assertEquals("PENDING_APPROVAL",grouped.get(2L).get(0).getStatus());assertTrue(attendance.entriesByEmployee(List.of(),start,end).isEmpty());
    }
}
