package com.emssystem.emsemployeeservice.shared.grpc;

import io.grpc.*;
import javax.net.ssl.SSLPeerUnverifiedException;
import java.security.cert.X509Certificate;
import org.springframework.stereotype.Component;
import org.springframework.grpc.server.GlobalServerInterceptor;

/** Only authorized service certificates may call these internal lookup APIs. */
@Component
@GlobalServerInterceptor
public class ServiceIdentityInterceptor implements ServerInterceptor {
    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(ServerCall<ReqT, RespT> call, Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        try {
            var session = call.getAttributes().get(Grpc.TRANSPORT_ATTR_SSL_SESSION);
            if (session != null) {
                var cert = (X509Certificate) session.getPeerCertificates()[0];
                var names = cert.getSubjectAlternativeNames();
                if (names != null && names.stream().anyMatch(name -> Integer.valueOf(2).equals(name.get(0))
                        && java.util.Set.of("workforce-service").contains(name.get(1))))
                    return next.startCall(call, headers);
            }
        } catch (SSLPeerUnverifiedException | java.security.cert.CertificateParsingException ex) {
            /* fail closed */ }
        call.close(Status.PERMISSION_DENIED.withDescription("Authorized service identity required"), new Metadata());
        return new ServerCall.Listener<>() {
        };
    }
}
