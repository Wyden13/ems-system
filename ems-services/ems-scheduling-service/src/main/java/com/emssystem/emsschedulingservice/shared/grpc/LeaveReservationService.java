package com.emssystem.emsschedulingservice.shared.grpc;

import com.emssystem.contracts.scheduling.v1.*;
import com.emssystem.emsschedulingservice.scheduling.service.SchedulingOperations;
import org.springframework.grpc.server.service.GrpcService;
import io.grpc.*;
import io.grpc.stub.StreamObserver;

@GrpcService
public class LeaveReservationService extends LeaveReservationsGrpc.LeaveReservationsImplBase {
    private final SchedulingOperations service;

    public LeaveReservationService(SchedulingOperations service) {
        this.service = service;
    }

    private void respond(StreamObserver<HoldResult> observer, java.util.function.Supplier<HoldResult> action) {
        try {
            observer.onNext(action.get());
            observer.onCompleted();
        } catch (IllegalArgumentException e) {
            observer.onError(Status.INVALID_ARGUMENT.asRuntimeException());
        } catch (RuntimeException e) {
            observer.onError(Status.UNAVAILABLE.withDescription("Schedule reservation could not be completed")
                    .asRuntimeException());
        }
    }

    @Override
    public void reserve(LeaveHold r, StreamObserver<HoldResult> o) {
        respond(o, () -> service.hold(r, true));
    }

    @Override
    public void conflicts(LeaveHold r, StreamObserver<HoldResult> o) {
        respond(o, () -> service.hold(r, false));
    }

    @Override
    public void release(HoldKey r, StreamObserver<HoldResult> o) {
        respond(o, () -> service.release(r.getRequestId()));
    }
}
