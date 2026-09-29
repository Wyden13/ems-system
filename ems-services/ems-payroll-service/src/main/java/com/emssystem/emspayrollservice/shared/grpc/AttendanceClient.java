package com.emssystem.emspayrollservice.shared.grpc;
import com.emssystem.contracts.workforce.v1.*;
import org.springframework.grpc.client.ImportGrpcClients;
import org.springframework.stereotype.Component;
import io.grpc.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
@Component
@ImportGrpcClients(target="attendance",types=AttendanceRecordsGrpc.AttendanceRecordsBlockingStub.class)
public class AttendanceClient {
 private final AttendanceRecordsGrpc.AttendanceRecordsBlockingStub stub;
 public AttendanceClient(AttendanceRecordsGrpc.AttendanceRecordsBlockingStub stub){this.stub=stub;}
 public List<AttendanceEntry> entries(long id,Instant from,Instant to){
  try{return stub.withDeadlineAfter(10,TimeUnit.SECONDS).getEntries(AttendanceLookup.newBuilder().setEmployeeId(id).setFromEpochSecond(from.getEpochSecond()).setToEpochSecond(to.getEpochSecond()).build()).getEntriesList();}
  catch(StatusRuntimeException ex){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Attendance is temporarily unavailable. Payroll estimates could not be calculated.");}
 }
}
