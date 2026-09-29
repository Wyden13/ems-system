package com.emssystem.emsorganizationservice.shared.grpc;
import com.emssystem.contracts.v1.*;
import com.emssystem.emsorganizationservice.organization.repository.DepartmentRepository;
import io.grpc.stub.StreamObserver;
import org.springframework.grpc.server.service.GrpcService;
import org.springframework.data.domain.Sort;
@GrpcService
public class OrganizationDirectoryService extends OrganizationDirectoryGrpc.OrganizationDirectoryImplBase {
 private final DepartmentRepository departments;
 public OrganizationDirectoryService(DepartmentRepository departments){this.departments=departments;}
 @Override public void listDepartments(DirectoryLookup request,StreamObserver<DepartmentDirectory> observer){
  var result=DepartmentDirectory.newBuilder();
  for(var d:departments.findAll(Sort.by("id")))result.addDepartments(DepartmentReference.newBuilder().setDepartmentId(d.getId()).setName(d.getDepartmentName()).setArchived(d.isArchived()).setLocationId(d.getLocation().getId()).setLocationName(d.getLocation().getName()));
  observer.onNext(result.build());observer.onCompleted();
 }
}
