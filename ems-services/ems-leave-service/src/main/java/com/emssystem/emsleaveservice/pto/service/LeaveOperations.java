package com.emssystem.emsleaveservice.pto.service;
import com.emssystem.emsleaveservice.shared.grpc.*;
import com.emssystem.emsleaveservice.shared.security.Caller;
import com.emssystem.emsleaveservice.pto.controller.LeaveApi.*;
import com.emssystem.emsleaveservice.pto.dto.request.UpsertPtoTypeRequest;
import com.emssystem.contracts.workforce.v1.EmployeeInfo;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.scheduling.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.*;import java.math.BigDecimal;import java.util.*;
import static com.emssystem.emsleaveservice.shared.Rows.*;
@Service @EnableScheduling
public class LeaveOperations {
 private final JdbcTemplate db;private final WorkforceClient workforce;private final SchedulingClient scheduling;private final TransactionTemplate tx;
 private static final ZoneId ZONE=ZoneId.of("America/Edmonton");
 public LeaveOperations(JdbcTemplate db,WorkforceClient workforce,SchedulingClient scheduling,TransactionTemplate tx){this.db=db;this.workforce=workforce;this.scheduling=scheduling;this.tx=tx;}
 private void lock(){db.queryForObject("select id from leave_lock where id=1 for update",Integer.class);}
 private ResponseStatusException error(HttpStatus status,String message){return new ResponseStatusException(status,message);}
 private void require(boolean ok,String message){if(!ok)throw error(HttpStatus.CONFLICT,message);}
 private void admin(){if(!"ADMIN".equals(Caller.current().role()))throw error(HttpStatus.FORBIDDEN,"Admin access required");}
 private EmployeeInfo mine(){return workforce.byAccount(Caller.current().accountId());}
 private boolean self(long employee){return workforce.byId(employee).getAccountId().equals(Caller.current().accountId().toString());}
 private void access(long employee,boolean review){
  var c=Caller.current();var p=workforce.byId(employee);boolean own=p.getAccountId().equals(c.accountId().toString());
  if(own&&!review)return;if(review&&own)throw error(HttpStatus.FORBIDDEN,"You cannot approve or reject your own PTO");
  if(c.manages()||c.supervises()&&mine().getDepartmentId()==p.getDepartmentId())return;
  throw error(HttpStatus.FORBIDDEN,"PTO access denied");
 }
 public List<Map<String,Object>> people(){var c=Caller.current();return (c.manages()?workforce.list(0):c.supervises()?workforce.list(mine().getDepartmentId()):List.of(mine())).stream().map(p->Map.<String,Object>of("id",p.getEmployeeId(),"name",p.getName(),"employeeNumber",p.getEmployeeNumber(),"departmentId",p.getDepartmentId(),"active",p.getActive(),"self",p.getAccountId().equals(c.accountId().toString()))).toList();}
 private Map<String,Object> request(long id){return one(db,"select r.*,t.name as pto_type_name from pto_requests r join pto_types t on t.id=r.pto_type_id where r.id=?",id);}
 public Map<String,Object> get(long id){var r=request(id);access(id(r,"employeeId"),false);return r;}
 public List<Map<String,Object>> list(String status,Long employee,boolean mineOnly){
  var allowed=people().stream().map(p->id(p,"id")).collect(java.util.stream.Collectors.toSet());
  Long selected=mineOnly?Long.valueOf(mine().getEmployeeId()):employee;if(selected!=null)access(selected,false);
  return query(db,"select r.*,t.name as pto_type_name from pto_requests r join pto_types t on t.id=r.pto_type_id order by r.start_date desc,r.id desc").stream().filter(r->allowed.contains(id(r,"employeeId"))&&(selected==null||id(r,"employeeId")==selected)&&(status==null||status.equals(r.get("status")))).toList();
 }
 public List<Map<String,Object>> types(){return query(db,"select * from pto_types order by name");}
 public Map<String,Object> type(Long id,UpsertPtoTypeRequest r){admin();require(r.accrualRatePerPeriod().signum()==0&&r.maxCarryover().signum()==0,"Automatic accrual and carryover are deferred; use zero for both");return tx.execute(s->{lock();Long key=id;if(key==null)key=db.queryForObject("insert into pto_types(name,accrual_rate_per_period,max_carryover,paid) values (?,0,0,?) returning id",Long.class,r.name().trim(),r.paid());else{one(db,"select * from pto_types where id=?",key);db.update("update pto_types set name=?,paid=?,version=version+1,updated_at=now() where id=?",r.name().trim(),r.paid(),key);}return one(db,"select * from pto_types where id=?",key);});}
 public void deleteType(long id){admin();tx.executeWithoutResult(s->{lock();one(db,"select * from pto_types where id=?",id);db.update("delete from pto_types where id=?",id);});}
 public List<Map<String,Object>> balances(Long employee){long key=employee==null?mine().getEmployeeId():employee;access(key,false);return query(db,"select b.*,t.name as pto_type_name,(b.accrued_hours-b.used_hours-b.reserved_hours) as available_hours from pto_balances b join pto_types t on t.id=b.pto_type_id where b.employee_id=? order by t.name",key);}
 public List<Map<String,Object>> ledger(long employee){access(employee,false);return query(db,"select l.*,t.name as pto_type_name from pto_ledger_entries l join pto_types t on t.id=l.pto_type_id where l.employee_id=? order by l.id desc",employee);}
 private void ensureBalance(long employee,long type){one(db,"select id from pto_types where id=?",type);db.update("insert into pto_balances(employee_id,pto_type_id) values (?,?) on conflict do nothing",employee,type);}
 private Map<String,Object> balance(long employee,long type){return one(db,"select * from pto_balances where employee_id=? and pto_type_id=?",employee,type);}
 private BigDecimal amount(Map<String,Object> row,String key){return (BigDecimal)row.get(key);}
 private BigDecimal available(Map<String,Object> b){return amount(b,"accruedHours").subtract(amount(b,"usedHours")).subtract(amount(b,"reservedHours"));}
 public Object adjust(Adjustment r){admin();workforce.byId(r.employeeId());require(r.hoursDelta().signum()!=0,"Enter a nonzero adjustment");return tx.execute(s->{lock();var old=query(db,"select * from pto_ledger_entries where request_key=?",r.requestKey());if(!old.isEmpty()){var previous=old.get(0);require(id(previous,"employeeId")==r.employeeId()&&id(previous,"ptoTypeId")==r.ptoTypeId()&&amount(previous,"hoursDelta").compareTo(r.hoursDelta())==0&&r.reason().equals(previous.get("reason")),"Adjustment key already used");return balances(r.employeeId());}
  ensureBalance(r.employeeId(),r.ptoTypeId());require(available(balance(r.employeeId(),r.ptoTypeId())).add(r.hoursDelta()).signum()>=0,"Adjustment would reduce the balance below reserved and used hours");
  db.update("update pto_balances set accrued_hours=accrued_hours+?,version=version+1,updated_at=now() where employee_id=? and pto_type_id=?",r.hoursDelta(),r.employeeId(),r.ptoTypeId());
  db.update("insert into pto_ledger_entries(employee_id,pto_type_id,hours_delta,entry_type,occurred_at,actor,reason,request_key) values (?,?,?,'ADJUSTMENT',now(),?,?,?)",r.employeeId(),r.ptoTypeId(),r.hoursDelta(),Caller.current().accountId(),r.reason(),r.requestKey());return balances(r.employeeId());});}
 public Map<String,Object> create(Request r){var p=mine();require(p.getActive(),"Employee is inactive");return tx.execute(s->{lock();var old=query(db,"select * from pto_requests where request_key=?",r.requestKey());if(!old.isEmpty()){var previous=old.get(0);require(id(previous,"employeeId")==p.getEmployeeId()&&id(previous,"ptoTypeId")==r.ptoTypeId()&&previous.get("startDate").equals(r.startDate())&&previous.get("endDate").equals(r.endDate())&&amount(previous,"hours").compareTo(r.hours())==0,"Request key already used");return request(id(previous,"id"));}
  require(!r.startDate().isBefore(LocalDate.now(ZONE))&&!r.endDate().isBefore(r.startDate())&&java.time.temporal.ChronoUnit.DAYS.between(r.startDate(),r.endDate())<366,"Choose future dates, up to one year");
  require(db.queryForObject("select count(*) from pto_requests where employee_id=? and status in ('PENDING','APPROVING','APPROVED','CANCELLING') and start_date<=? and end_date>=?",Long.class,p.getEmployeeId(),r.endDate(),r.startDate())==0,"A PTO request already overlaps these dates");
  ensureBalance(p.getEmployeeId(),r.ptoTypeId());require(available(balance(p.getEmployeeId(),r.ptoTypeId())).compareTo(r.hours())>=0,"Insufficient available PTO hours");
  long id=db.queryForObject("insert into pto_requests(employee_id,pto_type_id,start_date,end_date,hours,request_key) values (?,?,?,?,?,?) returning id",Long.class,p.getEmployeeId(),r.ptoTypeId(),r.startDate(),r.endDate(),r.hours(),r.requestKey());
  db.update("update pto_balances set reserved_hours=reserved_hours+?,version=version+1,updated_at=now() where employee_id=? and pto_type_id=?",r.hours(),p.getEmployeeId(),r.ptoTypeId());audit(id,"REQUEST",Caller.current().accountId(),"Requested");return request(id);});}
 private void audit(long id,String action,UUID actor,String reason){db.update("insert into pto_audits(request_id,action,actor,reason) values (?,?,?,?)",id,action,actor,reason==null?"":reason);}
 public Object history(long id){get(id);return query(db,"select * from pto_audits where request_id=? order by id",id);}
 public Object conflicts(long id){var r=get(id);var result=scheduling.reserve(id,id(r,"employeeId"),(LocalDate)r.get("startDate"),(LocalDate)r.get("endDate"),false);return Map.of("shiftIds",result.getConflictingShiftIdsList());}
 public Map<String,Object> review(long id,Decision input){
  require(List.of("APPROVED","REJECTED").contains(input.decision()),"Choose approve or reject");
  tx.executeWithoutResult(s->{lock();var r=request(id);access(id(r,"employeeId"),true);version(r,input.version());require("PENDING".equals(r.get("status")),"Only pending requests can be reviewed");
   if(input.decision().equals("REJECTED"))db.update("update pto_balances set reserved_hours=reserved_hours-?,version=version+1,updated_at=now() where employee_id=? and pto_type_id=?",r.get("hours"),id(r,"employeeId"),id(r,"ptoTypeId"));
   db.update("update pto_requests set status=?,reviewed_by=?,reviewed_at=now(),comment=?,operation_error=null,version=version+1,updated_at=now() where id=?",input.decision().equals("APPROVED")?"APPROVING":"REJECTED",Caller.current().accountId(),input.comment(),id);audit(id,input.decision().equals("APPROVED")?"APPROVAL_REQUESTED":"REJECTED",Caller.current().accountId(),input.comment());
  });
  process(id);var result=get(id);if(result.get("operationError")!=null&&"PENDING".equals(result.get("status")))throw error(HttpStatus.CONFLICT,result.get("operationError").toString());return result;
 }
 public Map<String,Object> cancel(long id,Cancel input){
  tx.executeWithoutResult(s->{lock();var r=request(id);access(id(r,"employeeId"),false);version(r,input.version());require(List.of("PENDING","APPROVED").contains(r.get("status")),"Only pending or approved requests can be cancelled");
   require(!self(id(r,"employeeId"))||!((LocalDate)r.get("startDate")).isBefore(LocalDate.now(ZONE)),"Ask a manager to reverse leave that has already started");
   if(r.get("status").equals("PENDING"))db.update("update pto_balances set reserved_hours=reserved_hours-?,version=version+1,updated_at=now() where employee_id=? and pto_type_id=?",r.get("hours"),id(r,"employeeId"),id(r,"ptoTypeId"));
   db.update("update pto_requests set status=?,comment=?,version=version+1,updated_at=now() where id=?",r.get("status").equals("APPROVED")?"CANCELLING":"CANCELLED",input.reason(),id);audit(id,"CANCEL_REQUESTED",Caller.current().accountId(),input.reason());
  });process(id);return get(id);
 }
 // Durable intermediate states allow automatic recovery after a timeout or process restart.
 @Scheduled(fixedDelayString="${app.leave.recovery-delay-ms:15000}",initialDelayString="${app.leave.recovery-delay-ms:15000}") public void recover(){
  for(Long id:db.queryForList("select id from pto_requests where status in ('APPROVING','CANCELLING') order by id",Long.class)){
   try{process(id);}catch(RuntimeException e){org.slf4j.LoggerFactory.getLogger(getClass()).warn("PTO transition {} will retry",id);}
  }
 }
 public void process(long id){tx.executeWithoutResult(s->{lock();var r=request(id);String status=(String)r.get("status");if(!List.of("APPROVING","CANCELLING").contains(status))return;
  long employee=id(r,"employeeId"),type=id(r,"ptoTypeId");BigDecimal hours=amount(r,"hours");
  try{
   if(status.equals("APPROVING")){
    var result=scheduling.reserve(id,employee,(LocalDate)r.get("startDate"),(LocalDate)r.get("endDate"),true);
    if(!result.getReserved()){
     db.update("update pto_requests set status='PENDING',operation_error=?,version=version+1,updated_at=now() where id=?","Cancel conflicting shift assignments before approving PTO (first 10): "+result.getConflictingShiftIdsList().stream().limit(10).toList(),id);audit(id,"APPROVAL_BLOCKED",(UUID)r.get("reviewedBy"),"Conflicting shift assignments");return;
    }
    db.update("update pto_balances set reserved_hours=reserved_hours-?,used_hours=used_hours+?,version=version+1,updated_at=now() where employee_id=? and pto_type_id=?",hours,hours,employee,type);
    db.update("insert into pto_ledger_entries(employee_id,pto_type_id,hours_delta,entry_type,source_request_id,occurred_at,actor,reason) values (?,?,?,'USAGE',?,now(),?,?)",employee,type,hours.negate(),id,r.get("reviewedBy"),r.get("comment"));
   }else{
    scheduling.release(id);
    db.update("update pto_balances set used_hours=used_hours-?,version=version+1,updated_at=now() where employee_id=? and pto_type_id=?",hours,employee,type);
    var actor=one(db,"select actor from pto_audits where request_id=? and action='CANCEL_REQUESTED' order by id desc limit 1",id).get("actor");
    db.update("insert into pto_ledger_entries(employee_id,pto_type_id,hours_delta,entry_type,source_request_id,occurred_at,actor,reason) values (?,?,?,'REVERSAL',?,now(),?,?)",employee,type,hours,id,actor,r.get("comment"));
   }
   String next=status.equals("APPROVING")?"APPROVED":"CANCELLED";db.update("update pto_requests set status=?,operation_error=null,version=version+1,updated_at=now() where id=?",next,id);audit(id,next,(UUID)r.get("reviewedBy"),r.get("comment")==null?"":r.get("comment").toString());
  }catch(ResponseStatusException e){if(e.getStatusCode().value()!=503)throw e;db.update("update pto_requests set operation_error=? where id=?",e.getReason(),id);}
 });}
}
