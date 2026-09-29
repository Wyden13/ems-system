package com.emssystem.emsleaveservice.shared.grpc;
import com.emssystem.contracts.scheduling.v1.*;
import io.grpc.*;
import org.springframework.grpc.client.ImportGrpcClients;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.LocalDate;import java.util.concurrent.TimeUnit;
@Component @ImportGrpcClients(target="scheduling",types=LeaveReservationsGrpc.LeaveReservationsBlockingStub.class)
public class SchedulingClient {
 private final LeaveReservationsGrpc.LeaveReservationsBlockingStub stub;
 public SchedulingClient(LeaveReservationsGrpc.LeaveReservationsBlockingStub stub){this.stub=stub;}
 public HoldResult reserve(long request,long employee,LocalDate start,LocalDate end,boolean reserve){try{var r=LeaveHold.newBuilder().setRequestId(request).setEmployeeId(employee).setStartDate(start.toString()).setEndDate(end.toString()).build();var client=stub.withDeadlineAfter(5,TimeUnit.SECONDS);return reserve?client.reserve(r):client.conflicts(r);}catch(StatusRuntimeException e){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Scheduling is temporarily unavailable. Approval/cancellation will retry automatically.");}}
 public void release(long request){try{stub.withDeadlineAfter(5,TimeUnit.SECONDS).release(HoldKey.newBuilder().setRequestId(request).build());}catch(StatusRuntimeException e){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Scheduling is temporarily unavailable. Cancellation will retry automatically.");}}
}
