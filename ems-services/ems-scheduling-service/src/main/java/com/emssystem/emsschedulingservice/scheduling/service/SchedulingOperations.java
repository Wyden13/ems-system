package com.emssystem.emsschedulingservice.scheduling.service;
import com.emssystem.emsschedulingservice.shared.grpc.*;
import com.emssystem.emsschedulingservice.shared.security.Caller;
import com.emssystem.emsschedulingservice.scheduling.controller.SchedulingApi.ShiftInput;
import com.emssystem.emsschedulingservice.scheduling.dto.request.*;
import com.emssystem.contracts.workforce.v1.EmployeeInfo;
import com.emssystem.contracts.scheduling.v1.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.*;
import java.util.*;
import static com.emssystem.emsschedulingservice.shared.Rows.*;
@Service @Transactional
public class SchedulingOperations {
 private static final ZoneId ZONE=ZoneId.of("America/Edmonton");
 private final JdbcTemplate db;private final WorkforceClient workforce;private final OrganizationClient organization;
 public SchedulingOperations(JdbcTemplate db,WorkforceClient workforce,OrganizationClient organization){this.db=db;this.workforce=workforce;this.organization=organization;}
 private void lock(){db.queryForObject("select id from scheduling_lock where id=1 for update",Integer.class);}
 private ResponseStatusException error(HttpStatus s,String message){return new ResponseStatusException(s,message);}
 private void require(boolean condition,String message){if(!condition)throw error(HttpStatus.CONFLICT,message);}
 private void planner(){var c=Caller.current();if(!c.manages()&&!c.supervises())throw error(HttpStatus.FORBIDDEN,"Supervisor, Manager or Admin access required");}
 private EmployeeInfo mine(){return workforce.byAccount(Caller.current().accountId());}
 private void department(Long department){planner();if(!Caller.current().manages()&&(department==null||mine().getDepartmentId()!=department))throw error(HttpStatus.FORBIDDEN,"This department is outside your access");}
 private Map<String,Object> shift(long id){return one(db,"select s.*,c.name as category_name,c.color from shifts s join shift_categories c on c.id=s.shift_category_id where s.id=?",id);}
 private Map<String,Object> view(Map<String,Object> s){s.put("assignments",query(db,"select * from shift_assignments where shift_id=? order by id",id(s,"id")));return s;}
 public Map<String,Object> options(){
  var c=Caller.current();boolean planner=c.manages()||c.supervises();long dept=c.manages()?0:mine().getDepartmentId();
  var people=(planner?workforce.list(dept):List.of(mine())).stream().map(p->Map.of("id",p.getEmployeeId(),"name",p.getName(),"employeeNumber",p.getEmployeeNumber(),"departmentId",p.getDepartmentId(),"active",p.getActive(),"self",p.getAccountId().equals(c.accountId().toString()))).toList();
  var departments=planner?organization.departments().stream().filter(d->dept==0||d.getDepartmentId()==dept).map(d->Map.of("id",d.getDepartmentId(),"name",d.getName(),"locationId",d.getLocationId(),"locationName",d.getLocationName(),"archived",d.getArchived())).toList():List.of();
  return Map.of("people",people,"departments",departments);
 }
 public List<Map<String,Object>> list(Instant from,Instant to){
  if(!to.isAfter(from)||Duration.between(from,to).compareTo(Duration.ofDays(62))>0)throw error(HttpStatus.BAD_REQUEST,"Choose up to 62 days");
  var c=Caller.current();Long dept=c.manages()?null:mine().getDepartmentId();Long employee=c.manages()||c.supervises()?null:mine().getEmployeeId();
  return query(db,"select s.*,c.name as category_name,c.color from shifts s join shift_categories c on c.id=s.shift_category_id where s.starts_at<? and s.ends_at>? order by s.starts_at,s.id",java.sql.Timestamp.from(to),java.sql.Timestamp.from(from)).stream()
   .filter(s->c.manages()||(employee==null?Objects.equals(s.get("departmentId"),dept):"PUBLISHED".equals(s.get("status"))&&db.queryForObject("select count(*) from shift_assignments where shift_id=? and employee_id=?",Long.class,id(s,"id"),employee)>0))
   .map(s->{view(s);if(employee!=null)s.put("assignments",query(db,"select * from shift_assignments where shift_id=? and employee_id=?",id(s,"id"),employee));return s;}).toList();
 }
 public Map<String,Object> get(long id){var s=shift(id);var c=Caller.current();if(c.manages()||c.supervises()){department((Long)s.get("departmentId"));return view(s);}var self=mine();if(!"PUBLISHED".equals(s.get("status"))||db.queryForObject("select count(*) from shift_assignments where shift_id=? and employee_id=?",Long.class,id,self.getEmployeeId())==0)throw error(HttpStatus.FORBIDDEN,"Shift access denied");s.put("assignments",query(db,"select * from shift_assignments where shift_id=? and employee_id=?",id,self.getEmployeeId()));return s;}
 public Map<String,Object> save(Long id,ShiftInput r){
  department(r.departmentId());lock();
  if(id!=null){var old=shift(id);department((Long)old.get("departmentId"));version(old,r.version());require("DRAFT".equals(old.get("status")),"Only draft shifts can be edited; cancel a published shift and create a replacement");require(db.queryForObject("select count(*) from shift_assignments where shift_id=? and status in ('ASSIGNED','ACCEPTED')",Long.class,id)==0,"Remove assignments before editing this shift");}
  require(r.endsAt().isAfter(r.startsAt())&&Duration.between(r.startsAt(),r.endsAt()).compareTo(Duration.ofHours(24))<=0,"Shift duration must be positive and no more than 24 hours");
  require(r.startsAt().isAfter(Instant.now()),"Create shifts in the future");
  var dept=organization.departments().stream().filter(d->d.getDepartmentId()==r.departmentId()).findFirst().orElseThrow(()->error(HttpStatus.BAD_REQUEST,"Department not found"));
  require(!dept.getArchived()&&dept.getLocationId()==r.locationId(),"Choose an active department and its location");
  require(Boolean.TRUE.equals(one(db,"select * from shift_categories where id=?",r.categoryId()).get("active")),"Choose an active shift category");
  if(id==null)id=db.queryForObject("insert into shifts(shift_category_id,department_id,location_id,starts_at,ends_at,required_employees) values (?,?,?,?,?,?) returning id",Long.class,r.categoryId(),r.departmentId(),r.locationId(),java.sql.Timestamp.from(r.startsAt()),java.sql.Timestamp.from(r.endsAt()),r.requiredEmployees());
  else db.update("update shifts set shift_category_id=?,department_id=?,location_id=?,starts_at=?,ends_at=?,required_employees=?,version=version+1,updated_at=now() where id=?",r.categoryId(),r.departmentId(),r.locationId(),java.sql.Timestamp.from(r.startsAt()),java.sql.Timestamp.from(r.endsAt()),r.requiredEmployees(),id);
  return view(shift(id));
 }
 private void touch(long id){db.update("update shifts set version=version+1,updated_at=now() where id=?",id);}
 private void eligible(Map<String,Object> s,long employee){
  var p=workforce.byId(employee);require(p.getActive(),"Inactive employees cannot be assigned");require(Objects.equals(s.get("departmentId"),p.getDepartmentId()),"Employee and shift must belong to the same department");
  Instant start=(Instant)s.get("startsAt"),end=(Instant)s.get("endsAt");
  require(db.queryForObject("select count(*) from shift_assignments a join shifts s on s.id=a.shift_id where a.employee_id=? and a.status in ('ASSIGNED','ACCEPTED') and s.status<>'CANCELLED' and s.id<>? and s.starts_at<? and s.ends_at>?",Long.class,employee,id(s,"id"),java.sql.Timestamp.from(end),java.sql.Timestamp.from(start))==0,"Employee has an overlapping assignment");
  require(db.queryForObject("select count(*) from leave_holds where employee_id=? and start_date<=? and end_date>=?",Long.class,employee,end.minusNanos(1).atZone(ZONE).toLocalDate(),start.atZone(ZONE).toLocalDate())==0,"Employee has approved or processing PTO on these dates");
  for(var a:query(db,"select * from employee_availability where employee_id=? and type='UNAVAILABLE'",employee)){
   for(LocalDate d=start.atZone(ZONE).toLocalDate();!d.isAfter(end.atZone(ZONE).toLocalDate());d=d.plusDays(1)){
    if(!d.getDayOfWeek().name().equals(a.get("dayOfWeek")))continue;
    Instant aStart=d.atTime((LocalTime)a.get("startTime")).atZone(ZONE).toInstant(),aEnd=d.atTime((LocalTime)a.get("endTime")).atZone(ZONE).toInstant();
    require(!start.isBefore(aEnd)||!end.isAfter(aStart),"Employee is unavailable during this shift");
   }
  }
 }
 public Map<String,Object> assign(long id,long employee,Long v){
  lock();var s=shift(id);department((Long)s.get("departmentId"));version(s,v);require(!"CANCELLED".equals(s.get("status"))&&((Instant)s.get("startsAt")).isAfter(Instant.now()),"This shift cannot be assigned");eligible(s,employee);
  require(db.queryForObject("select count(*) from shift_assignments where shift_id=? and status in ('ASSIGNED','ACCEPTED')",Long.class,id)<id(s,"requiredEmployees"),"Shift is fully staffed");
  var previous=query(db,"select * from shift_assignments where shift_id=? and employee_id=?",id,employee);
  if(previous.isEmpty())db.update("insert into shift_assignments(shift_id,employee_id) values (?,?)",id,employee);
  else {require(List.of("DECLINED","CANCELLED").contains(previous.get(0).get("status")),"Employee is already assigned");db.update("update shift_assignments set status='ASSIGNED',responded_at=null,version=version+1,updated_at=now() where id=?",id(previous.get(0),"id"));}
  touch(id);return view(shift(id));
 }
 public Map<String,Object> publish(long id,Long v){
  lock();var s=shift(id);department((Long)s.get("departmentId"));version(s,v);require("DRAFT".equals(s.get("status")),"Only draft shifts can be published");require(s.get("departmentId")!=null,"Set a department before publishing this legacy shift");
  require(((Instant)s.get("startsAt")).isAfter(Instant.now()),"Cannot publish a past shift");
  var d=organization.departments().stream().filter(x->x.getDepartmentId()==id(s,"departmentId")).findFirst();require(d.isPresent()&&!d.get().getArchived(),"Department is archived or unavailable");
  require(Boolean.TRUE.equals(one(db,"select * from shift_categories where id=?",id(s,"shiftCategoryId")).get("active")),"Category is inactive");
  for(var a:query(db,"select * from shift_assignments where shift_id=? and status in ('ASSIGNED','ACCEPTED')",id))eligible(s,id(a,"employeeId"));
  db.update("update shifts set status='PUBLISHED',version=version+1,updated_at=now() where id=?",id);return view(shift(id));
 }
 public Map<String,Object> cancel(long id,Long v){lock();var s=shift(id);department((Long)s.get("departmentId"));version(s,v);require(!"CANCELLED".equals(s.get("status")),"Shift is already cancelled");db.update("update shifts set status='CANCELLED',version=version+1,updated_at=now() where id=?",id);db.update("update shift_assignments set status='CANCELLED',version=version+1,updated_at=now() where shift_id=? and status in ('ASSIGNED','ACCEPTED')",id);return view(shift(id));}
 public Map<String,Object> unassign(long id,Long v){lock();var a=one(db,"select * from shift_assignments where id=?",id);var s=shift(id(a,"shiftId"));department((Long)s.get("departmentId"));version(a,v);require(List.of("ASSIGNED","ACCEPTED").contains(a.get("status")),"Assignment is already inactive");db.update("update shift_assignments set status='CANCELLED',version=version+1,updated_at=now() where id=?",id);touch(id(s,"id"));return view(shift(id(s,"id")));}
 public Map<String,Object> respond(long id,String response,Long v){
  require(List.of("ACCEPTED","DECLINED").contains(response),"Choose accept or decline");lock();var self=mine();var s=shift(id);require("PUBLISHED".equals(s.get("status"))&&((Instant)s.get("startsAt")).isAfter(Instant.now()),"Only upcoming published shifts accept responses");
  var a=one(db,"select * from shift_assignments where shift_id=? and employee_id=?",id,self.getEmployeeId());version(a,v);require(List.of("ASSIGNED","ACCEPTED").contains(a.get("status")),"This assignment is no longer active");if(response.equals("ACCEPTED"))eligible(s,self.getEmployeeId());
  db.update("update shift_assignments set status=?,responded_at=now(),version=version+1,updated_at=now() where id=?",response,id(a,"id"));touch(id);return get(id);
 }
 public List<Map<String,Object>> categories(){return query(db,"select * from shift_categories order by name");}
 public Map<String,Object> category(Long id,UpsertShiftCategoryRequest r){Caller.current().requireManager();lock();if(id==null)id=db.queryForObject("insert into shift_categories(name,color,default_start_time,default_end_time) values (?,?,?,?) returning id",Long.class,r.name().trim(),r.color(),r.defaultStartTime(),r.defaultEndTime());else {one(db,"select * from shift_categories where id=?",id);db.update("update shift_categories set name=?,color=?,default_start_time=?,default_end_time=?,version=version+1,updated_at=now() where id=?",r.name().trim(),r.color(),r.defaultStartTime(),r.defaultEndTime(),id);}return one(db,"select * from shift_categories where id=?",id);}
 public Map<String,Object> categoryActive(long id,boolean active){Caller.current().requireManager();lock();one(db,"select * from shift_categories where id=?",id);db.update("update shift_categories set active=?,version=version+1,updated_at=now() where id=?",active,id);return one(db,"select * from shift_categories where id=?",id);}
 public List<Map<String,Object>> availability(){return query(db,"select * from employee_availability where employee_id=? order by day_of_week,start_time",mine().getEmployeeId());}
 public Map<String,Object> saveAvailability(Long id,CreateAvailabilityRequest r){
  var self=mine();require(self.getActive(),"Employee is inactive");require(r.endTime().isAfter(r.startTime()),"Availability must end after it starts; split overnight availability into two days");lock();
  if(id!=null){var old=one(db,"select * from employee_availability where id=?",id);if(id(old,"employeeId")!=self.getEmployeeId())throw error(HttpStatus.FORBIDDEN,"Availability access denied");}
  if(id==null)id=db.queryForObject("insert into employee_availability(employee_id,day_of_week,start_time,end_time,type) values (?,?,?,?,?) returning id",Long.class,self.getEmployeeId(),r.dayOfWeek().name(),r.startTime(),r.endTime(),r.type().name());
  else db.update("update employee_availability set day_of_week=?,start_time=?,end_time=?,type=?,version=version+1,updated_at=now() where id=?",r.dayOfWeek().name(),r.startTime(),r.endTime(),r.type().name(),id);
  // Existing commitments must be removed by a planner before incompatible unavailability is saved.
  if(r.type().name().equals("UNAVAILABLE"))for(var s:query(db,"select s.* from shifts s join shift_assignments a on a.shift_id=s.id where a.employee_id=? and a.status in ('ASSIGNED','ACCEPTED') and s.status<>'CANCELLED' and s.ends_at>now()",self.getEmployeeId()))eligible(s,self.getEmployeeId());
  return one(db,"select * from employee_availability where id=?",id);
 }
 public void deleteAvailability(long id){lock();var self=mine();var a=one(db,"select * from employee_availability where id=?",id);if(id(a,"employeeId")!=self.getEmployeeId())throw error(HttpStatus.FORBIDDEN,"Availability access denied");db.update("delete from employee_availability where id=?",id);}
 // Internal mTLS methods use the same lock as assignments/publication.
 public HoldResult hold(LeaveHold r,boolean reserve){
  if(r.getRequestId()<=0||r.getEmployeeId()<=0)throw new IllegalArgumentException();
  var start=LocalDate.parse(r.getStartDate());var end=LocalDate.parse(r.getEndDate());if(end.isBefore(start))throw new IllegalArgumentException();lock();
  var existing=query(db,"select * from leave_holds where request_id=?",r.getRequestId());
  if(!existing.isEmpty()){var old=existing.get(0);require(id(old,"employeeId")==r.getEmployeeId()&&old.get("startDate").equals(start)&&old.get("endDate").equals(end),"Leave reservation identity mismatch");return HoldResult.newBuilder().setReserved(true).build();}
  var conflicts=db.queryForList("select distinct s.id from shifts s join shift_assignments a on a.shift_id=s.id where a.employee_id=? and a.status in ('ASSIGNED','ACCEPTED') and s.status<>'CANCELLED' and s.starts_at<? and s.ends_at>? order by s.id",Long.class,r.getEmployeeId(),java.sql.Timestamp.from(end.plusDays(1).atStartOfDay(ZONE).toInstant()),java.sql.Timestamp.from(start.atStartOfDay(ZONE).toInstant()));
  if(reserve&&conflicts.isEmpty())db.update("insert into leave_holds(request_id,employee_id,start_date,end_date) values (?,?,?,?)",r.getRequestId(),r.getEmployeeId(),start,end);
  return HoldResult.newBuilder().setReserved(reserve&&conflicts.isEmpty()).addAllConflictingShiftIds(conflicts).build();
 }
 public HoldResult release(long request){lock();db.update("delete from leave_holds where request_id=?",request);return HoldResult.getDefaultInstance();}
}
