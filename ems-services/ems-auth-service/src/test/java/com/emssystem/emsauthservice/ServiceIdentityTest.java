package com.emssystem.emsauthservice;
import com.emssystem.emsauthservice.shared.grpc.ServiceIdentityInterceptor;
import io.grpc.*;
import org.junit.jupiter.api.Test;
import javax.net.ssl.SSLSession;
import java.security.cert.X509Certificate;
import java.util.*;
import static org.mockito.Mockito.*;
class ServiceIdentityTest {
    @Test @SuppressWarnings("unchecked") void acceptsOnlyAuthenticatedEmployeeServiceCertificates() throws Exception {
        for (String identity : List.of("employee-service","organization-service","untrusted")) {
            ServerCall<Object,Object> call=mock(ServerCall.class);
            ServerCallHandler<Object,Object> next=mock(ServerCallHandler.class);
            SSLSession session=mock(SSLSession.class); X509Certificate certificate=mock(X509Certificate.class);
            when(call.getAttributes()).thenReturn(Attributes.newBuilder().set(Grpc.TRANSPORT_ATTR_SSL_SESSION,session).build());
            when(session.getPeerCertificates()).thenReturn(new java.security.cert.Certificate[]{certificate});
            when(certificate.getSubjectAlternativeNames()).thenReturn(List.of(List.of(2,identity)));
            new ServiceIdentityInterceptor().interceptCall(call,new Metadata(),next);
            if (identity.equals("employee-service")) verify(next).startCall(eq(call),any());
            else { verify(call).close(argThat(status -> status.getCode()==Status.Code.PERMISSION_DENIED),any());verifyNoInteractions(next); }
        }
    }
    @Test @SuppressWarnings("unchecked") void rejectsCallsWithoutTls() {
        ServerCall<Object,Object> call=mock(ServerCall.class);ServerCallHandler<Object,Object> next=mock(ServerCallHandler.class);
        when(call.getAttributes()).thenReturn(Attributes.EMPTY);
        new ServiceIdentityInterceptor().interceptCall(call,new Metadata(),next);
        verify(call).close(argThat(status -> status.getCode()==Status.Code.PERMISSION_DENIED),any());verifyNoInteractions(next);
    }
}
