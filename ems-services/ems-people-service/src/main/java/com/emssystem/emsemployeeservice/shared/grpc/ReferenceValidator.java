package com.emssystem.emsemployeeservice.shared.grpc;

import com.emssystem.contracts.v1.*;
import org.springframework.grpc.client.ImportGrpcClients;
import org.springframework.stereotype.Component;
import io.grpc.*;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Component
@ImportGrpcClients(target = "auth", types = AccountReferencesGrpc.AccountReferencesBlockingStub.class)
public class ReferenceValidator {
    // The first lookup also pays for DNS resolution and the mutual TLS handshake.
    private static final long LOOKUP_TIMEOUT_SECONDS = 10;
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ReferenceValidator.class);
    private final AccountReferencesGrpc.AccountReferencesBlockingStub accounts;
    private final com.emssystem.emsorganizationservice.organization.repository.DepartmentRepository departments;

    public ReferenceValidator(AccountReferencesGrpc.AccountReferencesBlockingStub accounts,
            com.emssystem.emsorganizationservice.organization.repository.DepartmentRepository departments) {
        this.accounts = accounts;
        this.departments = departments;
    }

    public void validate(Long departmentId, UUID accountId, Long existingDepartmentId, UUID existingAccountId) {
        var department = departments.findById(departmentId)
                .orElseThrow(() -> new ReferenceException(400, "departmentId", "Referenced record does not exist"));
        if (department.isArchived() && !Objects.equals(departmentId, existingDepartmentId))
            throw new ReferenceException(400, "departmentId", "Choose an active department");
        if (accountId != null && !Objects.equals(accountId, existingAccountId)) {
            try {
                accounts.withDeadlineAfter(LOOKUP_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                        .getAccount(AccountLookup.newBuilder().setAccountId(accountId.toString()).build());
            } catch (StatusRuntimeException ex) {
                throw translate(ex, "userAccountId");
            }
        }
    }

    private ReferenceException translate(StatusRuntimeException ex, String field) {
        if (ex.getStatus().getCode() == Status.Code.NOT_FOUND
                || ex.getStatus().getCode() == Status.Code.INVALID_ARGUMENT)
            return new ReferenceException(400, field, "Referenced record does not exist");
        log.warn("Reference lookup failed for {}: {}", field, ex.getStatus());
        return new ReferenceException(503, field, "Reference validation is temporarily unavailable. Try again.");
    }

    public static class ReferenceException extends RuntimeException {
        public final int status;
        public final String field;

        public ReferenceException(int status, String field, String message) {
            super(message);
            this.status = status;
            this.field = field;
        }
    }
}
