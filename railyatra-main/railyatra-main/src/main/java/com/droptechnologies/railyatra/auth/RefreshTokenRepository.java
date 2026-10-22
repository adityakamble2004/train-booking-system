package com.droptechnologies.railyatra.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class RefreshTokenRepository {

    public record TokenRow(long id, long userId, boolean revoked, boolean expired) {}

    private final JdbcTemplate jdbc;

    public RefreshTokenRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(long userId, String tokenHash, String device, String ip, int days) {
        jdbc.update("""
            INSERT INTO refresh_tokens (user_id, token_hash, device_label, ip_address, expires_at)
            VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))
            """, userId, tokenHash, device, ip, days);
    }

    public Optional<TokenRow> findByHash(String tokenHash) {
        return jdbc.query("""
            SELECT id, user_id,
                   (revoked_at IS NOT NULL) AS revoked,
                   (expires_at <= NOW())    AS expired
            FROM refresh_tokens WHERE token_hash = ?
            """,
            (rs, i) -> new TokenRow(rs.getLong("id"), rs.getLong("user_id"),
                    rs.getBoolean("revoked"), rs.getBoolean("expired")),
            tokenHash).stream().findFirst();
    }

    /** Returns 1 if this call revoked it, 0 if it was already revoked. */
    public int revoke(long id) {
        return jdbc.update("UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL", id);
    }

    public void revokeAllForUser(long userId) {
        jdbc.update("UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL", userId);
    }
}