package com.emssystem.emsattendanceservice;
import com.emssystem.emsattendanceservice.attendance.service.AttendanceOperations;
import com.emssystem.emsattendanceservice.attendance.dto.request.*;
import com.emssystem.emsschedulingservice.shared.grpc.WorkforceClient;
import com.emssystem.contracts.workforce.v1.EmployeeInfo;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;
import org.testcontainers.postgresql.PostgreSQLContainer;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
@SpringBootTest(classes=com.emssystem.EmsWorkforceServiceApplication.class, properties="ALLOWED_ORIGINS=http://localhost:15173")
@org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
class AttendancePostgresTest {
 static final PostgreSQLContainer DB=new PostgreSQLContainer("postgres:18-alpine");
 @DynamicPropertySource static void database(DynamicPropertyRegistry r){DB.start();r.add("spring.datasource.url",DB::getJdbcUrl);r.add("spring.datasource.username",DB::getUsername);r.add("spring.datasource.password",DB::getPassword);}
 @Autowired org.springframework.test.web.servlet.MockMvc mvc;
 @Autowired AttendanceOperations service;@Autowired JdbcTemplate jdbc;
 @MockitoBean WorkforceClient people;@MockitoBean Clock clock;
 final UUID worker=UUID.fromString("00000000-0000-0000-0000-000000000001"),manager=UUID.fromString("00000000-0000-0000-0000-000000000002");
 Instant instant=Instant.parse("2026-09-26T14:00:00Z");
 EmployeeInfo person(long id,UUID account,long dept,boolean active){return EmployeeInfo.newBuilder().setEmployeeId(id).setAccountId(account.toString()).setDepartmentId(dept).setName("Person "+id).setActive(active).setHourlyRate("20").build();}
 void login(UUID id,String role){var jwt=Jwt.withTokenValue("test").header("alg","HS256").subject(id.toString()).claim("role",role).build();SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));}
 @BeforeEach void setup(){
  jdbc.execute("TRUNCATE attendance_audits,time_entry_adjustments,time_entries,attendance_employee_locks RESTART IDENTITY CASCADE");
  when(clock.instant()).thenAnswer(i->instant);
  when(people.byAccount(worker)).thenReturn(person(1,worker,10,true));when(people.byId(1)).thenReturn(person(1,worker,10,true));
  when(people.byAccount(manager)).thenReturn(person(2,manager,20,true));when(people.byId(2)).thenReturn(person(2,manager,20,true));
  login(worker,"EMPLOYEE");
 }
 @AfterEach void clear(){SecurityContextHolder.clearContext();}
 @AfterAll static void stop(){DB.stop();}
 @Test void configuredBrowserOriginCanClockInAndSpoofedIdentityIsIgnored() throws Exception {
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/time-entries/clock-in")
   .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt().jwt(j->j.subject(worker.toString()).claim("role","EMPLOYEE")))
   .header("Origin","http://localhost:15173").header("X-User-Id",manager.toString())
   .contentType("application/json").content("{\"requestId\":\""+UUID.randomUUID()+"\"}"))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.employeeId").value(1));
 }
 @Test void currentEmployeesAreScopedAndIncludeOvernightSessionsUntilClockOut() throws Exception {
  var first=service.clockIn(worker,new ClockInRequest(UUID.randomUUID()));
  login(manager,"MANAGER");service.clockIn(manager,new ClockInRequest(UUID.randomUUID()));
  instant=instant.plusSeconds(30*3600);
  when(people.list(0)).thenReturn(List.of(person(1,worker,10,true),person(2,manager,20,true)));
  var current=service.current();assertEquals(instant,current.serverTime());
  assertEquals(Set.of(1L,2L),current.employees().stream().map(AttendanceOperations.ClockedInEmployee::employeeId).collect(java.util.stream.Collectors.toSet()));
  login(worker,"EMPLOYEE");assertEquals(List.of(1L),service.current().employees().stream().map(AttendanceOperations.ClockedInEmployee::employeeId).toList());
  service.clockOut(worker,new ClockOutRequest(first.id()));assertTrue(service.current().employees().isEmpty());
  login(manager,"SUPERVISOR");when(people.list(20)).thenReturn(List.of(person(2,manager,20,true)));
  assertEquals(List.of(2L),service.current().employees().stream().map(AttendanceOperations.ClockedInEmployee::employeeId).toList());
  clear();
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/time-entries/current")
    .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt().jwt(j->j.subject(manager.toString()).claim("role","ADMIN"))))
    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.employees.length()").value(1))
    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.employees[0].employeeId").value(2));
 }
 @Test void unknownOriginCannotMutateAttendance() throws Exception {
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/time-entries/clock-in")
   .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt().jwt(j->j.subject(worker.toString()).claim("role","EMPLOYEE")))
   .header("Origin","https://untrusted.example").contentType("application/json").content("{\"requestId\":\""+UUID.randomUUID()+"\"}"))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
 }
 @Test void clockReviewCorrectAndReapprovePreservesAudit(){
  var request=new ClockInRequest(UUID.randomUUID());var open=service.clockIn(worker,request);assertEquals(open.id(),service.clockIn(worker,request).id());
  instant=instant.plusSeconds(9*3600+17);var closed=service.clockOut(worker,new ClockOutRequest(open.id()));assertEquals(9*3600+17,closed.workedSeconds());assertEquals(closed.id(),service.clockOut(worker,new ClockOutRequest(open.id())).id());
  login(manager,"MANAGER");var approved=service.approve(closed.id(),manager,new ApproveTimeEntryRequest(closed.version(),"Checked"));assertEquals("APPROVED",approved.status().name());
  var adjusted=service.adjust(closed.id(),manager,new AdjustTimeEntryRequest(approved.version(),closed.clockIn(),closed.clockOut().minusSeconds(3600),"Correct forgotten clock-out"));assertEquals("PENDING_APPROVAL",adjusted.status().name());
  service.approve(adjusted.id(),manager,new ApproveTimeEntryRequest(adjusted.version(),"Rechecked"));assertEquals(3,service.history(adjusted.id()).size());
  assertEquals(409,assertThrows(ResponseStatusException.class,()->service.adjust(adjusted.id(),manager,new AdjustTimeEntryRequest(adjusted.version(),closed.clockIn(),closed.clockOut(),"Stale"))).getStatusCode().value());
 }
 @Test void roleDepartmentAndSelfReviewAreEnforced(){
  var open=service.clockIn(worker,new ClockInRequest(UUID.randomUUID()));instant=instant.plusSeconds(3600);var closed=service.clockOut(worker,new ClockOutRequest(open.id()));
  assertEquals(403,assertThrows(ResponseStatusException.class,()->service.approve(closed.id(),worker,new ApproveTimeEntryRequest(closed.version(),null))).getStatusCode().value());
  login(worker,"MANAGER");assertEquals(403,assertThrows(ResponseStatusException.class,()->service.approve(closed.id(),worker,new ApproveTimeEntryRequest(closed.version(),null))).getStatusCode().value());
  login(manager,"SUPERVISOR");assertThrows(ResponseStatusException.class,()->service.get(closed.id()));
  when(people.byAccount(manager)).thenReturn(person(2,manager,10,true));assertEquals(closed.id(),service.get(closed.id()).id());assertThrows(ResponseStatusException.class,()->service.approve(closed.id(),manager,new ApproveTimeEntryRequest(closed.version(),null)));
 }
 @Test void simultaneousIdenticalRequestsCreateOneSession() throws Exception {
  var pool=Executors.newFixedThreadPool(2);var request=new ClockInRequest(UUID.randomUUID());var start=new CountDownLatch(1);
  Callable<Long> action=()->{login(worker,"EMPLOYEE");try{start.await();return service.clockIn(worker,request).id();}finally{SecurityContextHolder.clearContext();}};
  try{var a=pool.submit(action);var b=pool.submit(action);start.countDown();assertEquals(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS));assertEquals(1,jdbc.queryForObject("select count(*) from time_entries",Integer.class));}finally{pool.shutdownNow();}
 }
 @Test void duplicateNewClockInAndCrossEmployeeClockOutFail(){
  var open=service.clockIn(worker,new ClockInRequest(UUID.randomUUID()));assertThrows(ResponseStatusException.class,()->service.clockIn(worker,new ClockInRequest(UUID.randomUUID())));
  login(manager,"MANAGER");assertThrows(ResponseStatusException.class,()->service.clockOut(manager,new ClockOutRequest(open.id())));
 }
 @Test void adjustmentsCannotOverlapAndInactiveCannotClockIn(){
  var first=service.clockIn(worker,new ClockInRequest(UUID.randomUUID()));instant=instant.plusSeconds(3600);var closed=service.clockOut(worker,new ClockOutRequest(first.id()));instant=instant.plusSeconds(3600);service.clockIn(worker,new ClockInRequest(UUID.randomUUID()));
  login(manager,"MANAGER");instant=instant.plusSeconds(3600);assertEquals(409,assertThrows(ResponseStatusException.class,()->service.adjust(closed.id(),manager,new AdjustTimeEntryRequest(closed.version(),closed.clockIn(),instant,"Overlap"))).getStatusCode().value());
  when(people.byAccount(manager)).thenReturn(person(2,manager,20,false));assertThrows(ResponseStatusException.class,()->service.clockIn(manager,new ClockInRequest(UUID.randomUUID())));
 }
 @Test void oldClockOutRetryDoesNotCloseNewSession(){
  var first=service.clockIn(worker,new ClockInRequest(UUID.randomUUID()));instant=instant.plusSeconds(3600);service.clockOut(worker,new ClockOutRequest(first.id()));instant=instant.plusSeconds(3600);var second=service.clockIn(worker,new ClockInRequest(UUID.randomUUID()));service.clockOut(worker,new ClockOutRequest(first.id()));assertEquals(second.id(),service.active().id());
 }
 @Test void timesheetClipsCompletedTimeToBusinessDatesAndDoesNotInventOvertime(){
  instant=Instant.parse("2026-09-26T05:30:00Z");var entry=service.clockIn(worker,new ClockInRequest(UUID.randomUUID()));
  instant=Instant.parse("2026-09-26T07:30:00Z");service.clockOut(worker,new ClockOutRequest(entry.id()));
  var sheet=service.getForAccount(worker,LocalDate.of(2026,9,26),LocalDate.of(2026,9,26));
  assertEquals(90,sheet.workedMinutes());assertNull(sheet.overtimeMinutes());
 }
}
