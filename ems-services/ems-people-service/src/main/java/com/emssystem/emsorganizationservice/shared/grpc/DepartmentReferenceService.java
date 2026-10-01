package com.emssystem.emsorganizationservice.shared.grpc;

import com.emssystem.contracts.v1.*;
import com.emssystem.emsorganizationservice.organization.repository.DepartmentRepository;
import io.grpc.*;
import io.grpc.stub.StreamObserver;
import org.springframework.grpc.server.service.GrpcService;

@GrpcService
public class DepartmentReferenceService extends DepartmentReferencesGrpc.DepartmentReferencesImplBase {
    private final DepartmentRepository departments;

    public DepartmentReferenceService(DepartmentRepository departments) {
        this.departments = departments;
    }

    @Override
    public void getDepartment(DepartmentLookup request, StreamObserver<DepartmentReference> observer) {
        if (request.getDepartmentId() <= 0) {
            observer.onError(Status.INVALID_ARGUMENT.asRuntimeException());
            return;
        }
        var result = departments.findById(request.getDepartmentId());
        if (result.isEmpty()) {
            observer.onError(Status.NOT_FOUND.asRuntimeException());
            return;
        }
        var department = result.get();
        observer.onNext(DepartmentReference.newBuilder().setDepartmentId(department.getId())
                .setName(department.getDepartmentName()).setArchived(department.isArchived()).build());
        observer.onCompleted();
    }
}
