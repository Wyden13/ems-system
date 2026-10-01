package com.emssystem.emsleaveservice.shared.grpc;

import com.emssystem.contracts.scheduling.v1.*;
import com.emssystem.emsschedulingservice.scheduling.service.SchedulingOperations;
import org.springframework.stereotype.Component;
import java.time.LocalDate;

/**
 * Local domain adapter: scheduling holds participate in the PTO transaction.
 */
@Component
public class SchedulingClient {
    private final SchedulingOperations scheduling;

    public SchedulingClient(SchedulingOperations scheduling) {
        this.scheduling = scheduling;
    }

    public HoldResult reserve(long request, long employee, LocalDate start, LocalDate end, boolean reserve) {
        var hold = LeaveHold.newBuilder().setRequestId(request).setEmployeeId(employee)
                .setStartDate(start.toString()).setEndDate(end.toString()).build();
        return scheduling.hold(hold, reserve);
    }

    public void release(long request) {
        scheduling.release(request);
    }
}
