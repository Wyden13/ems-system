package com.emssystem.emsschedulingservice;
import com.emssystem.emsschedulingservice.scheduling.service.SchedulingOperations;
import com.emssystem.emsschedulingservice.scheduling.controller.SchedulingApi.ShiftInput;
import com.emssystem.emsschedulingservice.scheduling.dto.request.*;
import com.emssystem.emsschedulingservice.scheduling.enums.*;
import com.emssystem.emsschedulingservice.shared.grpc.*;
import com.emssystem.contracts.workforce.v1.*;
import com.emssystem.contracts.v1.*;
import com.emssystem.contracts.scheduling.v1.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;
import org.testcontainers.postgresql.PostgreSQLContainer;
import java.time.*;import java.util.*;import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;import static org.mockito.Mockito.*;
import static com.emssystem.emsschedulingservice.shared.Rows.id;
@SpringBootTest @org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
class SchedulingPostgresTest {
 static final PostgreSQLContainer DB=new PostgreSQLContainer("postgres:18-alpine");
 @DynamicPropertySource static void db(DynamicPropertyRegistry r){DB.start();r.add("spring.datasource.url",DB::getJdbcUrl);r.add("spring.datasource.username",DB::getUsername);r.add("spring.datasource.password",DB::getPassword);}
 @Autowired SchedulingOperations service;@Autowired JdbcTemplate jdbc;@Autowired org.springframework.test.web.servlet.MockMvc mvc;
 @MockitoBean WorkforceClient people;@MockitoBean OrganizationClient organization;
 final UUID worker=UUID.fromString("00000000-0000-0000-0000-000000000001"),supervisor=UUID.fromString("00000000-0000-0000-0000-000000000002");
 long category;Instant start=LocalDate.now(ZoneId.of("America/Edmonton")).plusDays(3).atTime(9,0).atZone(ZoneId.of("America/Edmonton")).toInstant();
 EmployeeInfo person(long id,UUID account,long dept){return EmployeeInfo.newBuilder().setEmployeeId(id).setAccountId(account.toString()).setDepartmentId(dept).setName("Person "+id).setActive(true).setHourlyRate("99").build();}
 void login(UUID id,String role){var jwt=Jwt.withTokenValue("test").header("alg","HS256").subject(id.toString()).claim("role",role).build();SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));}
 @BeforeEach void setup(){jdbc.execute("truncate leave_holds,shift_assignments,shifts,shift_categories,employee_availability restart identity cascade");when(people.byAccount(worker)).thenReturn(person(1,worker,10));when(people.byId(1)).thenReturn(person(1,worker,10));when(people.byAccount(supervisor)).thenReturn(person(2,supervisor,10));when(people.byId(2)).thenReturn(person(2,supervisor,10));when(people.list(10)).thenReturn(List.of(person(1,worker,10),person(2,supervisor,10)));when(organization.departments()).thenReturn(List.of(DepartmentReference.newBuilder().setDepartmentId(10).setName("Team").setLocationId(1).build(),DepartmentReference.newBuilder().setDepartmentId(20).setName("Other").setLocationId(2).build()));login(supervisor,"MANAGER");category=id(service.category(null,new UpsertShiftCategoryRequest("Day","#abcdef",LocalTime.of(9,0),LocalTime.of(17,0))),"id");}
 @AfterEach void clear(){SecurityContextHolder.clearContext();}
 @AfterAll static void stop(){DB.stop();}
 Map<String,Object> shift(){return service.save(null,new ShiftInput(category,10L,1L,start,start.plusSeconds(8*3600),1,null));}
 @Test void publishAssignRespondCancelAndStaleUpdates(){var s=shift();long key=id(s,"id");s=service.assign(key,1,id(s,"version"));assertThrows(ResponseStatusException.class,()->service.publish(key,0L));s=service.publish(key,id(s,"version"));login(worker,"EMPLOYEE");assertEquals(1,service.list(start.minusSeconds(1),start.plusSeconds(30000)).size());service.respond(key,"ACCEPTED",0L);assertEquals("ACCEPTED",jdbc.queryForObject("select status from shift_assignments",String.class));login(supervisor,"MANAGER");s=service.get(key);service.cancel(key,id(s,"version"));assertEquals("CANCELLED",jdbc.queryForObject("select status from shift_assignments",String.class));}
 @Test void departmentScopeAndDraftPrivacy(){long key=id(shift(),"id");login(worker,"EMPLOYEE");assertTrue(service.list(start,start.plusSeconds(1)).isEmpty());assertThrows(ResponseStatusException.class,()->service.get(key));assertThrows(ResponseStatusException.class,this::shift);login(supervisor,"SUPERVISOR");assertThrows(ResponseStatusException.class,()->service.save(null,new ShiftInput(category,20L,2L,start,start.plusSeconds(1000),1,null)));assertFalse(service.options().toString().contains("hourlyRate"));}
 @Test void duplicateCapacityAndOverlappingAssignments(){var s=shift();service.assign(id(s,"id"),1,0L);var other=shift();assertThrows(ResponseStatusException.class,()->service.assign(id(other,"id"),1,0L));assertThrows(ResponseStatusException.class,()->service.assign(id(s,"id"),2,1L));}
 @Test void unavailabilityAndInactiveEmployeesBlockAssignments(){login(worker,"EMPLOYEE");service.saveAvailability(null,new CreateAvailabilityRequest(start.atZone(ZoneId.of("America/Edmonton")).getDayOfWeek(),LocalTime.of(8,0),LocalTime.of(18,0),AvailabilityType.UNAVAILABLE));login(supervisor,"MANAGER");var s=shift();assertThrows(ResponseStatusException.class,()->service.assign(id(s,"id"),1,0L));when(people.byId(2)).thenReturn(person(2,supervisor,10).toBuilder().setActive(false).build());assertThrows(ResponseStatusException.class,()->service.assign(id(s,"id"),2,0L));}
 @Test void leaveReservationAndAssignmentsExcludeEachOther(){var s=shift();long key=id(s,"id");LocalDate date=start.atZone(ZoneId.of("America/Edmonton")).toLocalDate();var hold=LeaveHold.newBuilder().setRequestId(1).setEmployeeId(1).setStartDate(date.toString()).setEndDate(date.toString()).build();assertTrue(service.hold(hold,true).getReserved());assertTrue(service.hold(hold,true).getReserved());assertThrows(ResponseStatusException.class,()->service.assign(key,1,0L));service.release(1);service.assign(key,1,0L);assertEquals(List.of(key),service.hold(hold,true).getConflictingShiftIdsList());}
 @Test void concurrentOverlappingAssignmentsHaveOneWinner() throws Exception {long a=id(shift(),"id"),b=id(shift(),"id");var pool=Executors.newFixedThreadPool(2);try{var gate=new CountDownLatch(1);List<Future<Boolean>> results=new ArrayList<>();for(long key:new long[]{a,b})results.add(pool.submit(()->{login(supervisor,"MANAGER");gate.await();try{service.assign(key,1,0L);return true;}catch(ResponseStatusException e){return false;}finally{clear();}}));gate.countDown();int success=0;for(var f:results)if(f.get())success++;assertEquals(1,success);}finally{pool.shutdownNow();}}
 @Test void foreignAvailabilityCannotBeChanged(){login(worker,"EMPLOYEE");long key=id(service.saveAvailability(null,new CreateAvailabilityRequest(DayOfWeek.MONDAY,LocalTime.of(8,0),LocalTime.of(9,0),AvailabilityType.AVAILABLE)),"id");login(supervisor,"SUPERVISOR");assertThrows(ResponseStatusException.class,()->service.deleteAvailability(key));}
 @Test void requestsRequireJwtAndIgnoreSpoofedHeaders() throws Exception {clear();mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/shifts/options").header("X-User-Id",supervisor.toString())).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());}
 @Test void existingV1DataSurvivesWorkflowMigration() throws Exception {
  String schema="upgrade_fixture";
  org.flywaydb.core.Flyway.configure().dataSource(DB.getJdbcUrl(),DB.getUsername(),DB.getPassword()).schemas(schema).defaultSchema(schema).target("1").load().migrate();
  try(var connection=java.sql.DriverManager.getConnection(DB.getJdbcUrl(),DB.getUsername(),DB.getPassword())){
   connection.setSchema(schema);var legacy=new JdbcTemplate(new org.springframework.jdbc.datasource.SingleConnectionDataSource(connection,true));
   legacy.update("insert into shift_categories(id,name,default_start_time,default_end_time) values (91,'Existing category','09:00','17:00')");
   legacy.update("insert into shifts(id,shift_category_id,starts_at,ends_at,location_id,required_employees) values (92,91,now(),now()+interval '8 hours',1,1)");
   org.flywaydb.core.Flyway.configure().dataSource(DB.getJdbcUrl(),DB.getUsername(),DB.getPassword()).schemas(schema).defaultSchema(schema).load().migrate();
   assertEquals(92L,legacy.queryForObject("select id from shifts",Long.class));assertNull(legacy.queryForObject("select department_id from shifts",Long.class));
  }finally{jdbc.execute("drop schema upgrade_fixture cascade");}
 }
}
