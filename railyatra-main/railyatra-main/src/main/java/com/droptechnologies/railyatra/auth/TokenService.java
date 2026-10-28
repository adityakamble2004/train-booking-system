package com.droptechnologies.railyatra.auth;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;


@Service
public class TokenService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final JwtEncoder encoder;
    private final long accessMinutes;

    public TokenService(JwtEncoder encoder, @Value("${app.jwt.access-minutes:15}") long accessMinutes) {
        this.encoder = encoder;
        this.accessMinutes = accessMinutes;
    }

    public String accessToken(long userId, String role) {
        Instant now = Instant.now();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("railyatra")
                .subject(String.valueOf(userId))
                .issuedAt(now)
                .expiresAt(now.plus(Duration.ofMinutes(accessMinutes)))
                .claim("role", role)
                .build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public long accessSeconds() {
        return accessMinutes * 60;
    }

    public String newRefreshToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
    public String delegatedToken(long ownerId, long delegationId,
            List<String> scopes, Duration ttl) {
Instant now = Instant.now();

JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();

JwtClaimsSet claims = JwtClaimsSet.builder()
.issuer("railyatra")
.subject(String.valueOf(ownerId))
.issuedAt(now)
.expiresAt(now.plus(ttl))
.claim("role", "AGENT")
.claim("act", Map.of("sub", "agent:" + delegationId))
.claim("delegation_id", String.valueOf(delegationId))
.claim("scope", String.join(" ", scopes))
.build();

return encoder.encode(
JwtEncoderParameters.from(header, claims)
).getTokenValue();
}
}