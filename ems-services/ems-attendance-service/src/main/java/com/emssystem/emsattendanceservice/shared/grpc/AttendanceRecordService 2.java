package com.emssystem.emsattendanceservice.shared.grpc;
import com.emssystem.contracts.workforce.v1.*;
import com.emssystem.emsattendanceservice.attendance.repository.TimeEntryRepository;
import io.grpc.*;
import io.grpc.stub.StreamObserver;
import org.springframework.grpc.server.service.GrpcService;
import java.time.*;
@GrpcService
public class AttendanceRecordService extends AttendanceRecordsGrpc.AttendanceRecordsImplBase {
 private final TimeEntryRepository entries;
 public AttendanceRecordService(TimeEntryRepository entries){this.entries=entries;}
 @Override public void getEntries(AttendanceLookup request,StreamObserver<AttendanceEntries> observer){
  if(request.getEmployeeId()<=0||request.getToEpochSecond()<=request.getFromEpochSecond()||request.getToEpochSecond()-request.getFromEpochSecond()>62L*86400){observer.onError(Status.INVALID_ARGUMENT.asRuntimeException());return;}
  var response=AttendanceEntries.newBuilder();
  for(var e:entries.overlapping(request.getEmployeeId(),Instant.ofEpochSecond(request.getFromEpochSecond()),Instant.ofEpochSecond(request.getToEpochSecond()))){
   var row=AttendanceEntry.newBuilder().setId(e.getId()).setClockIn(e.getClockIn().getEpochSecond()).setStatus(e.getStatus().name());
   if(e.getClockOut()!=null)row.setClockOut(e.getClockOut().getEpochSecond());response.addEntries(row);
  }
  observer.onNext(response.build());observer.onCompleted();
 }
}
