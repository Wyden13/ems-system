package com.emssystem.emsemployeeservice.shared.grpc;
import com.emssystem.contracts.v1.*;
import io.grpc.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
/** Exercise the generated blocking clients through a real ClientCall contract. */
class ReferenceValidatorTest {
    private Channel departmentChannel(boolean archived, Status failure) {
        return departmentChannel(archived, failure, 0);
    }
    private Channel departmentChannel(boolean archived, Status failure, long connectionDelayMillis) {
        return new Channel() {
            @Override public String authority() { return "test"; }
            @Override public <ReqT,RespT> ClientCall<ReqT,RespT> newCall(MethodDescriptor<ReqT,RespT> method,CallOptions options) {
                assertNotNull(options.getDeadline());
                return new ClientCall<>() {
                    Listener<RespT> listener;
                    @Override public void start(Listener<RespT> listener,Metadata metadata) { this.listener=listener; }
                    @Override public void request(int n) {}
                    @Override public void cancel(String message,Throwable cause) {}
                    @SuppressWarnings("unchecked") @Override public void halfClose() {
                        try {
                            Thread.sleep(connectionDelayMillis);
                        } catch (InterruptedException ex) {
                            Thread.currentThread().interrupt();
                            throw new AssertionError(ex);
                        }
                        if (options.getDeadline().isExpired()) {
                            listener.onClose(Status.DEADLINE_EXCEEDED, new Metadata());
                            return;
                        }
                        if (failure!=null) { listener.onClose(failure,new Metadata());return; }
                        listener.onHeaders(new Metadata());
                        listener.onMessage((RespT)DepartmentReference.newBuilder().setDepartmentId(10).setName("Operations").setArchived(archived).build());listener.onClose(Status.OK,new Metadata());
                    }
                    @Override public void sendMessage(ReqT request) {}
                };
            }
        };
    }
    private ReferenceValidator validator(boolean archived,Status failure) {
        var channel=departmentChannel(archived,failure);
        return new ReferenceValidator(AccountReferencesGrpc.newBlockingStub(channel),DepartmentReferencesGrpc.newBlockingStub(channel));
    }
    @Test void coldConnectionCanTakeLongerThanTwoSeconds() {
        var channel = departmentChannel(false, null, 2200);
        var validator = new ReferenceValidator(AccountReferencesGrpc.newBlockingStub(channel),
                DepartmentReferencesGrpc.newBlockingStub(channel));
        assertDoesNotThrow(() -> validator.validate(10L, null, null, null));
    }
    @Test void archivedDepartmentCanBeRetainedButNotNewlyAssigned() {
        var validator=validator(true,null);
        assertDoesNotThrow(() -> validator.validate(10L,null,10L,null));
        var error=assertThrows(ReferenceValidator.ReferenceException.class,() -> validator.validate(10L,null,null,null));
        assertEquals(400,error.status);assertEquals("departmentId",error.field);
    }
    @Test void missingReferenceAndDependencyFailureHaveDifferentErrors() {
        var missing=assertThrows(ReferenceValidator.ReferenceException.class,() -> validator(false,Status.NOT_FOUND).validate(10L,null,null,null));
        assertEquals(400,missing.status);
        for (var status:List.of(Status.DEADLINE_EXCEEDED,Status.UNAVAILABLE,Status.PERMISSION_DENIED)) {
            var error=assertThrows(ReferenceValidator.ReferenceException.class,() -> validator(false,status).validate(10L,null,null,null));
            assertEquals(503,error.status);
        }
    }
}
