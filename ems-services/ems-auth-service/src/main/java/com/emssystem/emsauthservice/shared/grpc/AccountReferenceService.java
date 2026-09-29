package com.emssystem.emsauthservice.shared.grpc;
import com.emssystem.contracts.v1.*;
import com.emssystem.emsauthservice.user.repository.UserAccountRepository;
import io.grpc.*;
import io.grpc.stub.StreamObserver;
import org.springframework.grpc.server.service.GrpcService;
@GrpcService
public class AccountReferenceService extends AccountReferencesGrpc.AccountReferencesImplBase {
    private final UserAccountRepository accounts;
    public AccountReferenceService(UserAccountRepository accounts) { this.accounts=accounts; }
    @Override public void getAccount(AccountLookup request, StreamObserver<AccountReference> observer) {
        java.util.UUID id;
        try { id=java.util.UUID.fromString(request.getAccountId()); }
        catch (IllegalArgumentException ex) { observer.onError(Status.INVALID_ARGUMENT.asRuntimeException()); return; }
        if (!accounts.existsById(id)) { observer.onError(Status.NOT_FOUND.asRuntimeException()); return; }
        observer.onNext(AccountReference.newBuilder().setAccountId(id.toString()).build()); observer.onCompleted();
    }
}
