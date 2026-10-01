package com.emssystem.emsschedulingservice.shared.grpc;
import com.emssystem.contracts.workforce.v1.*;
import io.grpc.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.springframework.grpc.client.ImportGrpcClients;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
@Component
@ImportGrpcClients(target="people",types=WorkforceReferencesGrpc.WorkforceReferencesBlockingStub.class)
public class WorkforceClient {
 private final WorkforceReferencesGrpc.WorkforceReferencesBlockingStub stub;
 public WorkforceClient(WorkforceReferencesGrpc.WorkforceReferencesBlockingStub stub) {this.stub=stub;}
 public EmployeeInfo byAccount(UUID id) {return get(EmployeeLookup.newBuilder().setAccountId(id.toString()).build());}
 public EmployeeInfo byId(long id) {return get(EmployeeLookup.newBuilder().setEmployeeId(id).build());}
 private EmployeeInfo get(EmployeeLookup lookup) {
  try {return stub.withDeadlineAfter(10,TimeUnit.SECONDS).getEmployee(lookup);}
  catch(StatusRuntimeException ex) {throw translate(ex);}
 }
 public List<EmployeeInfo> list(long department) {
  try {return stub.withDeadlineAfter(10,TimeUnit.SECONDS).listEmployees(EmployeeFilter.newBuilder().setDepartmentId(department).build()).getEmployeesList();}
  catch(StatusRuntimeException ex) {throw translate(ex);}
 }
 private ResponseStatusException translate(StatusRuntimeException ex) {
  return ex.getStatus().getCode()==Status.Code.NOT_FOUND
   ? new ResponseStatusException(HttpStatus.NOT_FOUND,"No linked employee record. Contact your administrator.")
   : new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Employee details are temporarily unavailable. Try again.");
 }
}
