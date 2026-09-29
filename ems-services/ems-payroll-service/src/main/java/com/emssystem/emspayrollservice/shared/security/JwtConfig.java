package com.emssystem.emspayrollservice.shared.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

@Configuration
public class JwtConfig {

    @Bean
    public SecretKey jwtSecretKey(
            @Value("${security.jwt.secret}") String base64Secret
    ) {
        byte[] secretBytes;

        try {
            secretBytes = Base64.getDecoder().decode(base64Secret);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "security.jwt.secret must be a valid Base64 value",
                    exception
            );
        }

        if (secretBytes.length < 32) {
            throw new IllegalStateException(
                    "security.jwt.secret must decode to at least 32 bytes"
            );
        }

        return new SecretKeySpec(secretBytes, "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder(SecretKey secretKey) {
        JWKSource<SecurityContext> jwkSource = new ImmutableSecret<>(secretKey);
        return new NimbusJwtEncoder(jwkSource);
    }

    @Bean
    public JwtDecoder jwtDecoder(
            SecretKey secretKey,
            @Value("${security.jwt.issuer:ems-auth-service}") String issuer
    ) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(secretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuer), token -> {
                    try {
                        java.util.UUID.fromString(token.getSubject());
                        if (!"access".equals(token.getClaimAsString("token_type")) || token.getExpiresAt() == null)
                            throw new IllegalArgumentException();
                        return org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.success();
                    } catch (RuntimeException ex) {
                        return org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.failure(
                            new org.springframework.security.oauth2.core.OAuth2Error("invalid_token"));
                    }
                }));
        return decoder;
    }
}
