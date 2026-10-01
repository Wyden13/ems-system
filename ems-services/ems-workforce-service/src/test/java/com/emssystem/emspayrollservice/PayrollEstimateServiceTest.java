package com.emssystem.emspayrollservice;
import com.emssystem.emspayrollservice.payroll.service.PayrollEstimateService;
import com.emssystem.emspayrollservice.payroll.calculation.AttendancePayCalculator;
import com.emssystem.emspayrollservice.shared.grpc.*;
import com.emssystem.emsschedulingservice.shared.grpc.WorkforceClient;
import com.emssystem.contracts.workforce.v1.*;
import org.junit.jupiter.api.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class PayrollEstimateServiceTest {
 private final UUID account=UUID.randomUUID();
 private int attendanceQueries;private Set<Long> requestedIds;
 private String rate="20.00";private String entryStatus="APPROVED";
 private final WorkforceClient people=new WorkforceClient(null){
  public EmployeeInfo byAccount(UUID id){return employee(1);}
  public EmployeeInfo byId(long id){return employee(id);}
  public List<EmployeeInfo> list(long department){return List.of(employee(1),employee(2));}
 };
 private EmployeeInfo employee(long id){return EmployeeInfo.newBuilder().setEmployeeId(id).setAccountId(account.toString()).setName("Employee "+id).setHourlyRate(rate).build();}
 private final AttendanceClient attendance=new AttendanceClient(null){public Map<Long,List<AttendanceEntry>> entriesByEmployee(Collection<Long> ids,Instant from,Instant to){attendanceQueries++;requestedIds=Set.copyOf(ids);var rows=List.of(AttendanceEntry.newBuilder().setId(1).setClockIn(Instant.parse("2026-09-26T14:00:00Z").getEpochSecond()).setClockOut(Instant.parse("2026-09-26T22:00:00Z").getEpochSecond()).setStatus(entryStatus).build());var grouped=new HashMap<Long,List<AttendanceEntry>>();for(long id:ids)grouped.put(id,rows);return grouped;}};
 private PayrollEstimateService service(){return new PayrollEstimateService(people,attendance,new AttendancePayCalculator(),Clock.fixed(Instant.parse("2026-10-15T00:00:00Z"),ZoneOffset.UTC));}
 private void login(String role){var jwt=Jwt.withTokenValue("test").header("alg","HS256").subject(account.toString()).claim("role",role).build();SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));}
 @AfterEach void clear(){SecurityContextHolder.clearContext();}
 @Test void supervisorCanOnlySeeOwnMoney(){login("SUPERVISOR");assertEquals(1,service().report(LocalDate.of(2026,9,25),null).estimates().size());assertEquals(Set.of(1L),requestedIds);assertEquals(403,assertThrows(ResponseStatusException.class,()->service().report(LocalDate.of(2026,9,25),2L)).getStatusCode().value());}
 @Test void managerCanSeeAll(){login("MANAGER");assertEquals(2,service().report(LocalDate.of(2026,9,25),null).estimates().size());assertEquals(1,attendanceQueries);assertEquals(Set.of(1L,2L),requestedIds);}
 @Test void onlyApprovedTimeIsPayableAndCurrentRateIsLive(){login("EMPLOYEE");var start=LocalDate.of(2026,9,25);assertEquals("160.00",service().report(start,null).estimates().get(0).grossPay().toPlainString());rate="30";assertEquals("240.00",service().report(start,null).estimates().get(0).grossPay().toPlainString());entryStatus="PENDING_APPROVAL";var result=service().report(start,null).estimates().get(0);assertEquals(0,result.approvedSeconds());assertTrue(result.provisional());entryStatus="REJECTED";assertEquals(0,service().report(start,null).estimates().get(0).approvedSeconds());}
}
