package com.emssystem.emsschedulingservice.shared.grpc;
import com.emssystem.contracts.v1.*;
import io.grpc.*;
import org.springframework.grpc.client.ImportGrpcClients;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
import java.util.concurrent.TimeUnit;
@Component @ImportGrpcClients(target="organization",types=OrganizationDirectoryGrpc.OrganizationDirectoryBlockingStub.class)
public class OrganizationClient {
 private final OrganizationDirectoryGrpc.OrganizationDirectoryBlockingStub stub;
 public OrganizationClient(OrganizationDirectoryGrpc.OrganizationDirectoryBlockingStub stub){this.stub=stub;}
 public List<DepartmentReference> departments(){try{return stub.withDeadlineAfter(3,TimeUnit.SECONDS).listDepartments(DirectoryLookup.getDefaultInstance()).getDepartmentsList();}catch(StatusRuntimeException e){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Organization details are temporarily unavailable.");}}
}
