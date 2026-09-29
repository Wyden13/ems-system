package com.emssystem.emsorganizationservice.shared.grpc;
import io.grpc.*;
import javax.net.ssl.SSLPeerUnverifiedException;
import java.security.cert.X509Certificate;
import org.springframework.stereotype.Component;
import org.springframework.grpc.server.GlobalServerInterceptor;
/** Only the employee service certificate may call these internal lookup APIs. */
@Component @GlobalServerInterceptor
public class ServiceIdentityInterceptor implements ServerInterceptor {
    @Override public <ReqT,RespT> ServerCall.Listener<ReqT> interceptCall(ServerCall<ReqT,RespT> call, Metadata headers, ServerCallHandler<ReqT,RespT> next) {
        try {
            var session=call.getAttributes().get(Grpc.TRANSPORT_ATTR_SSL_SESSION);
            if (session != null) {
                var cert=(X509Certificate)session.getPeerCertificates()[0];
                var names=cert.getSubjectAlternativeNames();
                if (names != null && names.stream().anyMatch(name -> Integer.valueOf(2).equals(name.get(0)) && ("ems.references.v1.OrganizationDirectory/ListDepartments".equals(call.getMethodDescriptor().getFullMethodName()) ? "scheduling-service".equals(name.get(1)) : "employee-service".equals(name.get(1)))))
                    return next.startCall(call,headers);
            }
        } catch (SSLPeerUnverifiedException | java.security.cert.CertificateParsingException ex) { /* fail closed */ }
        call.close(Status.PERMISSION_DENIED.withDescription("Employee service identity required"),new Metadata());
        return new ServerCall.Listener<>() {};
    }
}
