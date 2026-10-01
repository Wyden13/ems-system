package com.emssystem.emsemployeeservice.shared.grpc;

import com.emssystem.contracts.workforce.v1.*;
import com.emssystem.emsemployeeservice.employee.entity.Employee;
import com.emssystem.emsemployeeservice.employee.repository.EmployeeRepository;
import io.grpc.*;
import io.grpc.stub.StreamObserver;
import org.springframework.grpc.server.service.GrpcService;
import java.util.*;

@GrpcService
public class WorkforceReferenceService extends WorkforceReferencesGrpc.WorkforceReferencesImplBase {
    private final EmployeeRepository employees;

    public WorkforceReferenceService(EmployeeRepository employees) {
        this.employees = employees;
    }

    private EmployeeInfo map(Employee e) {
        return EmployeeInfo.newBuilder().setEmployeeId(e.getId())
                .setAccountId(e.getUserAccountId() == null ? "" : e.getUserAccountId().toString())
                .setDepartmentId(e.getDepartmentId()).setName(e.getFirstName() + " " + e.getLastName())
                .setEmployeeNumber(e.getEmployeeNumber()).setActive(e.isActive())
                .setHourlyRate(e.getPayRate().toPlainString()).build();
    }

    @Override
    public void getEmployee(EmployeeLookup request, StreamObserver<EmployeeInfo> observer) {
        try {
            var found = request.hasAccountId() ? employees.findByUserAccountId(UUID.fromString(request.getAccountId()))
                    : employees.findById(request.getEmployeeId());
            if (found.isEmpty()) {
                observer.onError(Status.NOT_FOUND.asRuntimeException());
                return;
            }
            observer.onNext(map(found.get()));
            observer.onCompleted();
        } catch (IllegalArgumentException ex) {
            observer.onError(Status.INVALID_ARGUMENT.asRuntimeException());
        }
    }

    @Override
    public void listEmployees(EmployeeFilter request, StreamObserver<Employees> observer) {
        var result = Employees.newBuilder();
        employees.findAll().stream()
                .filter(e -> request.getDepartmentId() == 0 || e.getDepartmentId() == request.getDepartmentId())
                .forEach(e -> result.addEmployees(map(e)));
        observer.onNext(result.build());
        observer.onCompleted();
    }
}
