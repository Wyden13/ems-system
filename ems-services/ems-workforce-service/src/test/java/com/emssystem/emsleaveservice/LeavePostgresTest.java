package com.emssystem.emsleaveservice;
import com.emssystem.emsleaveservice.pto.service.LeaveOperations;
import com.emssystem.emsleaveservice.pto.controller.LeaveApi.*;
import com.emssystem.emsleaveservice.pto.dto.request.*;
import com.emssystem.emsleaveservice.shared.grpc.*;
import com.emssystem.emsschedulingservice.shared.grpc.WorkforceClient;
import com.emssystem.contracts.workforce.v1.*;import com.emssystem.contracts.scheduling.v1.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.context.SpringBootTest;import org.springframework.test.context.*;import org.springframework.test.context.bean.override.mockito.MockitoBean;import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;import org.springframework.security.oauth2.jwt.Jwt;import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;import org.springframework.web.server.ResponseStatusException;import org.springframework.http.HttpStatus;
import org.testcontainers.postgresql.PostgreSQLContainer;
import java.time.*;import java.math.BigDecimal;import java.util.*;import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;import static org.mockito.Mockito.*;import static com.emssystem.emsleaveservice.shared.Rows.id;
@SpringBootTest(classes=com.emssystem.EmsWorkforceServiceApplication.class, properties="app.leave.recovery-delay-ms=3600000") @org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
class LeavePostgresTest {
 static final PostgreSQLContainer DB=new PostgreSQLContainer("postgres:18-alpine");
 @DynamicPropertySource static void db(DynamicPropertyRegistry r){DB.start();r.add("spring.datasource.url",DB::getJdbcUrl);r.add("spring.datasource.username",DB::getUsername);r.add("spring.datasource.password",DB::getPassword);}
 @Autowired LeaveOperations service;@Autowired JdbcTemplate jdbc;@Autowired org.springframework.test.web.servlet.MockMvc mvc;@MockitoBean WorkforceClient people;@MockitoBean SchedulingClient scheduling;
 UUID worker=UUID.fromString("00000000-0000-0000-0000-000000000001"),supervisor=UUID.fromString("00000000-0000-0000-0000-000000000002"),other=UUID.fromString("00000000-0000-0000-0000-000000000003");long type;LocalDate day=LocalDate.now(ZoneId.of("America/Edmonton")).plusDays(3);
 EmployeeInfo person(long id,UUID account,long dept){return EmployeeInfo.newBuilder().setEmployeeId(id).setAccountId(account.toString()).setDepartmentId(dept).setName("Person "+id).setActive(true).build();}
 void login(UUID id,String role){var jwt=Jwt.withTokenValue("test").header("alg","HS256").subject(id.toString()).claim("role",role).build();SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));}
 @BeforeEach void setup(){jdbc.execute("truncate pto_audits,pto_ledger_entries,pto_requests,pto_balances,pto_types restart identity cascade");when(people.byAccount(worker)).thenReturn(person(1,worker,10));when(people.byId(1)).thenReturn(person(1,worker,10));when(people.byAccount(supervisor)).thenReturn(person(2,supervisor,10));when(people.byId(2)).thenReturn(person(2,supervisor,10));when(people.byAccount(other)).thenReturn(person(3,other,20));when(people.byId(3)).thenReturn(person(3,other,20));when(people.list(anyLong())).thenReturn(List.of(person(1,worker,10),person(2,supervisor,10)));when(scheduling.reserve(anyLong(),anyLong(),any(),any(),eq(true))).thenReturn(HoldResult.newBuilder().setReserved(true).build());login(supervisor,"ADMIN");type=id(service.type(null,new UpsertPtoTypeRequest("Vacation",BigDecimal.ZERO,BigDecimal.ZERO,true)),"id");service.adjust(new Adjustment(UUID.randomUUID(),1L,type,new BigDecimal("16"),"Opening balance"));login(worker,"EMPLOYEE");}
 @AfterEach void clear(){SecurityContextHolder.clearContext();}@AfterAll static void stop(){DB.stop();}
 Request input(LocalDate date,String hours){return new Request(UUID.randomUUID(),type,date,date,new BigDecimal(hours));}
 Map<String,Object> request(){return service.create(input(day,"8"));}
 @Test void dayRequestWithoutTotalPersistsSignatureAndReservesOnce(){
  var input=new Request(UUID.randomUUID(),type,day,day.plusDays(1),null,"Family trip","DAYS",null,"Vacation","  Person One  ");
  var r=service.create(input);long key=id(r,"id");
  assertEquals("DAYS",r.get("requestUnit"));assertEquals(new BigDecimal("2.00"),r.get("requestedAmount"));
  assertEquals(new BigDecimal("16.00"),r.get("hours"));assertEquals("Vacation",r.get("reasonCategory"));
  assertEquals("Person One",r.get("employeeSignature"));assertNotNull(r.get("signedAt"));
  assertEquals(key,id(service.create(input),"id"));assertEquals(new BigDecimal("16.00"),balance("reserved_hours"));
  assertThrows(ResponseStatusException.class,()->service.create(new Request(input.requestKey(),type,day,day.plusDays(1),null,"Family trip","DAYS",null,"Vacation","Another Person")));
  login(supervisor,"SUPERVISOR");r=service.review(key,new Decision(0L,"APPROVED","Enjoy"));
  assertEquals("Person One",r.get("employeeSignature"));
  login(worker,"EMPLOYEE");r=service.cancel(key,new Cancel(id(r,"version"),"Plans changed"));
  assertEquals("Person One",r.get("employeeSignature"));assertEquals(new BigDecimal("0.00"),balance("used_hours"));
 }
 @Test void hourlyRequestUsesRequestedHoursAndDayOverrideUsesTotal(){
  var hourly=service.create(new Request(UUID.randomUUID(),type,day,day,null,"Appointment","HOURS",new BigDecimal("2.50"),"Medical leave","Person One"));
  assertEquals(new BigDecimal("2.50"),hourly.get("hours"));
  var days=service.create(new Request(UUID.randomUUID(),type,day.plusDays(1),day.plusDays(2),new BigDecimal("8"),null,"DAYS",null,"Personal leave","Person One"));
  assertEquals(new BigDecimal("8.00"),days.get("hours"));assertEquals(new BigDecimal("2.00"),days.get("requestedAmount"));
  assertEquals(new BigDecimal("10.50"),balance("reserved_hours"));
 }
 @Test void requestApiAcceptsOmittedTotalAndRejectsMissingSignature() throws Exception {
  String body="{\"requestKey\":\""+UUID.randomUUID()+"\",\"ptoTypeId\":"+type+",\"startDate\":\""+day+"\",\"endDate\":\""+day+"\",\"requestUnit\":\"DAYS\",\"reasonCategory\":\"Vacation\",\"employeeSignature\":\"Person One\"}";
  var jwt=org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt().jwt(token->token.subject(worker.toString()).claim("role","EMPLOYEE"));
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/pto/requests").contentType("application/json").content(body.replace("Person One","")).with(jwt))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
  assertEquals(new BigDecimal("0.00"),balance("reserved_hours"));
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/pto/requests").contentType("application/json").content(body).with(jwt))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.hours").value(8))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.employeeSignature").value("Person One"))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.signedAt").isNotEmpty());
  assertEquals(new BigDecimal("8.00"),balance("reserved_hours"));
 }
 BigDecimal balance(String field){return jdbc.queryForObject("select "+field+" from pto_balances where employee_id=1",BigDecimal.class);}
 @Test void reservationApprovalCancellationAndAuditAreExactlyOnce(){var r=request();long key=id(r,"id");assertEquals(new BigDecimal("8.00"),balance("reserved_hours"));login(supervisor,"SUPERVISOR");r=service.review(key,new Decision(id(r,"version"),"APPROVED","Enjoy"));assertEquals("APPROVED",r.get("status"));service.process(key);assertEquals(new BigDecimal("8.00"),balance("used_hours"));login(worker,"EMPLOYEE");r=service.cancel(key,new Cancel(id(r,"version"),"Plans changed"));assertEquals("CANCELLED",r.get("status"));service.process(key);assertEquals(new BigDecimal("0.00"),balance("used_hours"));assertEquals(2L,jdbc.queryForObject("select count(*) from pto_ledger_entries where source_request_id=?",Long.class,key));assertTrue(jdbc.queryForObject("select count(*) from pto_audits",Long.class)>=4);}
 @Test void leaveReasonSurvivesReviewAndCancellationAndIsPartOfRetryIdentity(){
  var input=new Request(UUID.randomUUID(),type,day,day,new BigDecimal("8"),"  Family trip  ");
  var r=service.create(input);long key=id(r,"id");assertEquals("Family trip",r.get("reason"));
  assertEquals(key,id(service.create(input),"id"));
  assertThrows(ResponseStatusException.class,()->service.create(new Request(input.requestKey(),type,day,day,new BigDecimal("8"),"Different reason")));
  login(supervisor,"SUPERVISOR");r=service.review(key,new Decision(0L,"APPROVED","Enjoy"));
  assertEquals("Family trip",r.get("reason"));assertEquals("Enjoy",r.get("comment"));
  login(worker,"EMPLOYEE");r=service.cancel(key,new Cancel(id(r,"version"),"Plans changed"));
  assertEquals("Family trip",r.get("reason"));assertEquals("Plans changed",r.get("comment"));
  assertEquals("Family trip",jdbc.queryForObject("select reason from pto_audits where request_id=? and action='REQUEST'",String.class,key));
 }
 @Test void retryDoesNotReserveTwiceAndConflictingPayloadFails(){var input=input(day,"8");var first=service.create(input);assertEquals(first.get("id"),service.create(input).get("id"));assertEquals(new BigDecimal("8.00"),balance("reserved_hours"));assertThrows(ResponseStatusException.class,()->service.create(new Request(input.requestKey(),type,day,day,new BigDecimal("4"))));}
 @Test void insufficientBalanceAndOverlapAreRejected(){request();assertThrows(ResponseStatusException.class,()->service.create(input(day.plusDays(1),"9")));assertThrows(ResponseStatusException.class,()->service.create(input(day,"1")));}
 @Test void selfApprovalForeignDepartmentAndStaleDecisionFail(){var r=request();long key=id(r,"id");login(worker,"MANAGER");assertThrows(ResponseStatusException.class,()->service.review(key,new Decision(0L,"APPROVED","")));login(other,"SUPERVISOR");assertThrows(ResponseStatusException.class,()->service.get(key));login(supervisor,"SUPERVISOR");assertThrows(ResponseStatusException.class,()->service.review(key,new Decision(9L,"APPROVED","")));assertThrows(ResponseStatusException.class,()->service.adjust(new Adjustment(UUID.randomUUID(),1L,type,BigDecimal.ONE,"Not admin")));}
 @Test void rejectedAndCancelledPendingRequestsReleaseReservation(){var r=request();login(supervisor,"SUPERVISOR");service.review(id(r,"id"),new Decision(0L,"REJECTED","Not this week"));assertEquals(new BigDecimal("0.00"),balance("reserved_hours"));login(worker,"EMPLOYEE");r=request();service.cancel(id(r,"id"),new Cancel(0L,"Changed dates"));assertEquals(new BigDecimal("0.00"),balance("reserved_hours"));}
 @Test void conflictsReturnToPendingWithoutConsumingHours(){var r=request();when(scheduling.reserve(anyLong(),anyLong(),any(),any(),eq(true))).thenReturn(HoldResult.newBuilder().addConflictingShiftIds(17).build());login(supervisor,"SUPERVISOR");assertThrows(ResponseStatusException.class,()->service.review(id(r,"id"),new Decision(0L,"APPROVED","")));assertEquals("PENDING",service.get(id(r,"id")).get("status"));assertEquals(new BigDecimal("8.00"),balance("reserved_hours"));assertEquals(new BigDecimal("0.00"),balance("used_hours"));}
 @Test void failedLocalSchedulingRollsBackApprovalAndBalance(){var r=request();when(scheduling.reserve(anyLong(),anyLong(),any(),any(),eq(true))).thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Injected failure"));login(supervisor,"SUPERVISOR");assertThrows(ResponseStatusException.class,()->service.review(id(r,"id"),new Decision(0L,"APPROVED","")));assertEquals("PENDING",service.get(id(r,"id")).get("status"));assertEquals(new BigDecimal("8.00"),balance("reserved_hours"));assertEquals(new BigDecimal("0.00"),balance("used_hours"));assertEquals(0L,jdbc.queryForObject("select count(*) from pto_ledger_entries where entry_type='USAGE'",Long.class));}

 @Test void concurrentRequestsCannotOverdraw() throws Exception {var pool=Executors.newFixedThreadPool(2);try{var gate=new CountDownLatch(1);List<Future<Boolean>> results=new ArrayList<>();for(int i=0;i<2;i++){final int dayOffset=i;results.add(pool.submit(()->{login(worker,"EMPLOYEE");gate.await();try{service.create(input(day.plusDays(dayOffset),"12"));return true;}catch(ResponseStatusException e){return false;}finally{clear();}}));}gate.countDown();int success=0;for(var r:results)if(r.get())success++;assertEquals(1,success);assertEquals(new BigDecimal("12.00"),balance("reserved_hours"));}finally{pool.shutdownNow();}}
 @Test void adjustmentRetriesAndNegativeBalancesAreGuarded(){login(supervisor,"ADMIN");var a=new Adjustment(UUID.randomUUID(),1L,type,BigDecimal.ONE,"Correction");service.adjust(a);service.adjust(a);assertEquals(new BigDecimal("17.00"),balance("accrued_hours"));assertThrows(ResponseStatusException.class,()->service.adjust(new Adjustment(UUID.randomUUID(),1L,type,new BigDecimal("-18"),"Too much")));}
 @Test void managerDeductionIsAuditedExactlyOnceAndCannotCreditPto(){
  login(supervisor,"MANAGER");
  var deduction=new Deduction(UUID.randomUUID(),1L,type,new BigDecimal("4"),"  Manual correction  ");
  service.deduct(deduction);service.deduct(deduction);
  assertEquals(new BigDecimal("12.00"),balance("accrued_hours"));
  assertEquals(1L,jdbc.queryForObject("select count(*) from pto_ledger_entries where entry_type='DEDUCTION'",Long.class));
  assertEquals(new BigDecimal("-4.00"),jdbc.queryForObject("select hours_delta from pto_ledger_entries where entry_type='DEDUCTION'",BigDecimal.class));
  assertEquals(supervisor,jdbc.queryForObject("select actor from pto_ledger_entries where entry_type='DEDUCTION'",UUID.class));
  assertEquals("Manual correction",jdbc.queryForObject("select reason from pto_ledger_entries where entry_type='DEDUCTION'",String.class));
  assertThrows(ResponseStatusException.class,()->service.deduct(new Deduction(UUID.randomUUID(),1L,type,new BigDecimal("-4"),"Cannot add")));
  assertThrows(ResponseStatusException.class,()->service.adjust(new Adjustment(UUID.randomUUID(),1L,type,BigDecimal.ONE,"Cannot allocate")));
  assertThrows(ResponseStatusException.class,()->service.deduct(new Deduction(deduction.requestKey(),1L,type,new BigDecimal("3"),"Changed payload")));
 }
 @Test void deductionsProtectReservedAndUsedPtoAndAllowExactlyAvailableAmount(){
  var r=request();login(supervisor,"MANAGER");
  assertThrows(ResponseStatusException.class,()->service.deduct(new Deduction(UUID.randomUUID(),1L,type,new BigDecimal("9"),"Too much")));
  r=service.review(id(r,"id"),new Decision(0L,"APPROVED","Approved"));
  assertThrows(ResponseStatusException.class,()->service.deduct(new Deduction(UUID.randomUUID(),1L,type,new BigDecimal("9"),"Still too much")));
  service.deduct(new Deduction(UUID.randomUUID(),1L,type,new BigDecimal("8"),"Remove available balance"));
  assertEquals(new BigDecimal("8.00"),balance("accrued_hours"));
  assertEquals(new BigDecimal("8.00"),balance("used_hours"));
  assertEquals(new BigDecimal("0.00"),balance("reserved_hours"));
 }
 @Test void onlyManagersAndAdminsCanDeductAndReasonIsRequired(){
  for(String role:List.of("EMPLOYEE","SUPERVISOR")){
   login(supervisor,role);
   var failure=assertThrows(ResponseStatusException.class,()->service.deduct(new Deduction(UUID.randomUUID(),1L,type,BigDecimal.ONE,"Not permitted")));
   assertEquals(HttpStatus.FORBIDDEN,failure.getStatusCode());
  }
  login(supervisor,"ADMIN");
  assertThrows(ResponseStatusException.class,()->service.deduct(new Deduction(UUID.randomUUID(),1L,type,BigDecimal.ONE,"  ")));
  service.deduct(new Deduction(UUID.randomUUID(),1L,type,BigDecimal.ONE,"Admin correction"));
  assertEquals(new BigDecimal("15.00"),balance("accrued_hours"));
 }
 @Test void deductionEndpointValidatesAmountsAndEnforcesManagerPermission() throws Exception {
  clear();
  String body="{\"requestKey\":\""+UUID.randomUUID()+"\",\"employeeId\":1,\"ptoTypeId\":"+type+",\"hours\":4,\"reason\":\"Manual deduction\"}";
  var endpoint=org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/pto/balances/deduct");
  mvc.perform(endpoint.contentType("application/json").content(body).with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt->jwt.subject(supervisor.toString()).claim("role","EMPLOYEE"))))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/pto/balances/deduct").contentType("application/json").content(body.replace("\"hours\":4","\"hours\":0")).with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt->jwt.subject(supervisor.toString()).claim("role","MANAGER"))))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/pto/balances/deduct").contentType("application/json").content(body).with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt->jwt.subject(supervisor.toString()).claim("role","MANAGER"))))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
  assertEquals(new BigDecimal("12.00"),balance("accrued_hours"));
 }
 @Test void unsignedSpoofedIdentityIsRejected() throws Exception {clear();mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/pto/requests").header("X-User-Id",supervisor.toString())).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());}

 @Test void listingWithoutEmployeeFilterIsScopedAndSupportsOwnAndExplicitFilters(){
  var r=request();login(supervisor,"SUPERVISOR");
  assertEquals(List.of(r.get("id")),service.list(null,null,false).stream().map(x->x.get("id")).toList());
  assertEquals(1,service.list("PENDING",1L,false).size());
  assertTrue(service.list(null,null,true).isEmpty());
  assertTrue(service.list("APPROVED",null,false).isEmpty());
  when(people.list(20)).thenReturn(List.of(person(3,other,20)));login(other,"SUPERVISOR");assertTrue(service.list(null,null,false).isEmpty());
  login(worker,"EMPLOYEE");assertEquals(1,service.list(null,null,false).size());
 }
}
