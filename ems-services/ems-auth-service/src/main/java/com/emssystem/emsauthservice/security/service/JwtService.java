package com.emssystem.emsauthservice.security.service;

import com.emssystem.emsauthservice.user.entity.UserAccount;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class JwtService {
    private final JwtEncoder jwtEncoder;
    private final String issuer;
    private final Duration accessTokenTtl;

    public JwtService(
            JwtEncoder jwtEncoder,
            @Value(("${security.jwt.issuer:ems-auth-service}")) String issuer,
            @Value(("${security.jwt.access-token-ttl:PT15M")) Duration accessTokenTtl){
        this.jwtEncoder = jwtEncoder;
        this.issuer = issuer;
        this.accessTokenTtl = accessTokenTtl;
    }

    public IssuedAccessToken issuedAccessToken(UserAccount account, Instant issuedAt){
        Instant expiresAt = issuedAt.plus(accessTokenTtl);
        JwsHeader header = JwsHeader
                .with(MacAlgorithm.HS256)
                .type("JWT")
                .build();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .subject(account.getId().toString())
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .id(UUID.randomUUID().toString())
                .claim("email",account.getEmail())
                .claim("role",account.getRole())
                .claim("token_type","access")
                .build();
        String token = jwtEncoder.encode(
                JwtEncoderParameters.from(header,claims)
        ).getTokenValue();
        return new IssuedAccessToken(token,expiresAt);
    }
    public record IssuedAccessToken(String value, Instant expiresAt) {
    }
}
