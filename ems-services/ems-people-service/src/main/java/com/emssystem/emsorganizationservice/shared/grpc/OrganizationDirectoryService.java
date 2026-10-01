package com.emssystem.emsorganizationservice.shared.grpc;

import com.emssystem.contracts.v1.*;
import com.emssystem.emsorganizationservice.organization.repository.DepartmentRepository;
import io.grpc.stub.StreamObserver;
import org.springframework.grpc.server.service.GrpcService;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

@GrpcService
public class OrganizationDirectoryService extends OrganizationDirectoryGrpc.OrganizationDirectoryImplBase {
    private final DepartmentRepository departments;

    public OrganizationDirectoryService(DepartmentRepository departments) {
        this.departments = departments;
    }

    @Override
    @Transactional(readOnly = true)
    public void listDepartments(DirectoryLookup request, StreamObserver<DepartmentDirectory> observer) {
        var response = DepartmentDirectory.newBuilder();
        for (var d : departments.findAll(Sort.by("id")))
            response.addDepartments(DepartmentReference.newBuilder().setDepartmentId(d.getId())
                    .setName(d.getDepartmentName()).setArchived(d.isArchived()).setLocationId(d.getLocation().getId())
                    .setLocationName(d.getLocation().getName()));
        observer.onNext(response.build());
        observer.onCompleted();
    }
}
