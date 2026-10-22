package com.droptechnologies.railyatra.auth;

import com.droptechnologies.railyatra.auth.RefreshTokenRepository.TokenRow;
import com.droptechnologies.railyatra.auth.UserRepository.UserRow;
import com.droptechnologies.railyatra.auth.dto.AuthResponse;
import com.droptechnologies.railyatra.auth.dto.LoginRequest;
import com.droptechnologies.railyatra.auth.dto.RegisterRequest;
import com.droptechnologies.railyatra.auth.dto.UserSummary;
import com.droptechnologies.railyatra.common.error.ApiException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;

@Service
public class AuthService {

    private static final int MAX_FAILS = 5;
    private static final int LOCK_MINUTES = 15;
    private static final int REFRESH_DAYS = 14;

    public record Session(AuthResponse body, String refreshToken) {}

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final TokenService tokens;
    private final PasswordEncoder encoder;
    private final String dummyHash;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens,
                       TokenService tokens, PasswordEncoder encoder) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.tokens = tokens;
        this.encoder = encoder;
        this.dummyHash = encoder.encode("not-a-real-password-1");
    }

    @Transactional
    public Session register(RegisterRequest r, String device, String ip) {
        if (tooLong(r.password())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Password is too long");
        }
        String email = normalize(r.email());
        String phone = (r.phone() == null || r.phone().isBlank()) ? null : r.phone().trim();
        try {
            long id = users.insertUser(email, phone, encoder.encode(r.password()));
            users.insertProfile(id, r.fullName().trim());
            UserRow user = users.findById(id).orElseThrow();
            return issue(user, device, ip);
        } catch (DuplicateKeyException e) {
            throw new ApiException(HttpStatus.CONFLICT, "ACCOUNT_EXISTS",
                    "An account with this email or phone already exists");
        }
    }

    /** Deliberately NOT @Transactional: the failed-attempt counter must survive the exception. */
    public Session login(LoginRequest r, String device, String ip) {
        String email = normalize(r.email());
        Optional<UserRow> found = users.findByEmail(email);

        if (found.isEmpty() || tooLong(r.password())) {
            encoder.matches("x", dummyHash);   // keeps timing similar for unknown emails
            throw invalidCredentials();
        }
        UserRow user = found.get();
        if (user.locked()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "ACCOUNT_LOCKED",
                    "Too many failed attempts. Try again in " + LOCK_MINUTES + " minutes.");
        }
        boolean active = "ACTIVE".equals(user.status());
        boolean passwordOk = encoder.matches(r.password(), user.passwordHash());
        if (!active || !passwordOk) {
            if (active) {
                users.recordFailedLogin(user.id(), MAX_FAILS, LOCK_MINUTES);
            }
            throw invalidCredentials();
        }
        users.resetFailedLogins(user.id());
        return issue(user, device, ip);
    }

    /** noRollbackFor: when we detect token reuse we revoke everything and THEN throw; that revoke must commit. */
    @Transactional(noRollbackFor = ApiException.class)
    public Session refresh(String rawToken, String device, String ip) {
        if (rawToken == null || rawToken.isBlank()) {
            throw unauthorized("NO_REFRESH_TOKEN", "Log in to continue");
        }
        TokenRow token = refreshTokens.findByHash(TokenService.sha256(rawToken))
                .orElseThrow(() -> unauthorized("INVALID_REFRESH_TOKEN", "Log in again"));

        if (token.revoked()) {
            refreshTokens.revokeAllForUser(token.userId());
            throw unauthorized("REFRESH_TOKEN_REUSED", "Session no longer valid. Log in again");
        }
        if (token.expired()) {
            throw unauthorized("INVALID_REFRESH_TOKEN", "Session expired. Log in again");
        }
        if (refreshTokens.revoke(token.id()) == 0) {
            refreshTokens.revokeAllForUser(token.userId());
            throw unauthorized("REFRESH_TOKEN_REUSED", "Session no longer valid. Log in again");
        }
        UserRow user = users.findById(token.userId())
                .filter(u -> "ACTIVE".equals(u.status()))
                .orElseThrow(() -> unauthorized("INVALID_REFRESH_TOKEN", "Log in again"));
        return issue(user, device, ip);
    }

    public void logout(String rawToken) {
        if (rawToken != null && !rawToken.isBlank()) {
            refreshTokens.findByHash(TokenService.sha256(rawToken))
                    .ifPresent(t -> refreshTokens.revoke(t.id()));
        }
    }

    private Session issue(UserRow user, String device, String ip) {
        String access = tokens.accessToken(user.id(), user.role());
        String refresh = tokens.newRefreshToken();
        refreshTokens.insert(user.id(), TokenService.sha256(refresh), device, ip, REFRESH_DAYS);
        AuthResponse body = new AuthResponse(access, "Bearer", tokens.accessSeconds(),
                new UserSummary(user.id(), user.email(), user.fullName(), user.role()));
        return new Session(body, refresh);
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean tooLong(String password) {
        return password.getBytes(StandardCharsets.UTF_8).length > 72;   // bcrypt limit
    }

    private static ApiException invalidCredentials() {
        return unauthorized("INVALID_CREDENTIALS", "Email or password is incorrect");
    }

    private static ApiException unauthorized(String code, String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, code, message);
    }
}