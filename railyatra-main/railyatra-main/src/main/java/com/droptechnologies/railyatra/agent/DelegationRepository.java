package com.droptechnologies.railyatra.agent;

import com.droptechnologies.railyatra.agent.dto.ActionResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
public class DelegationRepository {

    public record Row(long id, long ownerUserId, String name, String status, List<String> scopes,
                      int maxFarePerBookingPaise, int maxSpend24hPaise, int maxPassengers,
                      List<String> allowedClasses, boolean savedPassengersOnly, boolean usable,
                      Instant expiresAt, Instant createdAt, Instant revokedAt) {}

    private static final String SELECT = """
        SELECT id, owner_user_id, name, status, scopes, max_fare_per_booking_paise, max_spend_24h_paise,
               max_passengers, allowed_classes, saved_passengers_only,
               (status = 'ACTIVE' AND expires_at > NOW()) AS usable,
               expires_at, created_at, revoked_at
        FROM agent_delegations
        """;

    private final JdbcTemplate jdbc;

    public DelegationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static Row map(ResultSet rs, int i) throws SQLException {
        String classes = rs.getString("allowed_classes");
        Timestamp revoked = rs.getTimestamp("revoked_at");
        return new Row(rs.getLong("id"), rs.getLong("owner_user_id"), rs.getString("name"), rs.getString("status"),
                List.of(rs.getString("scopes").split(" ")),
                rs.getInt("max_fare_per_booking_paise"), rs.getInt("max_spend_24h_paise"),
                rs.getInt("max_passengers"),
                classes == null || classes.isBlank() ? List.of() : List.of(classes.split(",")),
                rs.getBoolean("saved_passengers_only"), rs.getBoolean("usable"),
                rs.getTimestamp("expires_at").toInstant(), rs.getTimestamp("created_at").toInstant(),
                revoked == null ? null : revoked.toInstant());
    }

    public Optional<Row> findById(long id) {
        return jdbc.query(SELECT + " WHERE id = ?", DelegationRepository::map, id).stream().findFirst();
    }

    public Optional<Row> findOwned(long id, long ownerId) {
        return jdbc.query(SELECT + " WHERE id = ? AND owner_user_id = ?", DelegationRepository::map, id, ownerId)
                .stream().findFirst();
    }

    public List<Row> listByOwner(long ownerId) {
        return jdbc.query(SELECT + " WHERE owner_user_id = ? ORDER BY id DESC", DelegationRepository::map, ownerId);
    }

    public int countActive(long ownerId) {
        Integer n = jdbc.queryForObject("""
            SELECT COUNT(*) FROM agent_delegations
            WHERE owner_user_id = ? AND status = 'ACTIVE' AND expires_at > NOW()
            """, Integer.class, ownerId);
        return n == null ? 0 : n;
    }

    public long insert(long ownerId, String name, String scopes, int maxFare, int maxSpend24h, int maxPassengers,
                       String allowedClasses, boolean savedOnly, int validDays) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                INSERT INTO agent_delegations
                    (owner_user_id, name, scopes, max_fare_per_booking_paise, max_spend_24h_paise,
                     max_passengers, allowed_classes, saved_passengers_only, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))
                """, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, ownerId);
            ps.setString(2, name);
            ps.setString(3, scopes);
            ps.setInt(4, maxFare);
            ps.setInt(5, maxSpend24h);
            ps.setInt(6, maxPassengers);
            ps.setString(7, allowedClasses);
            ps.setBoolean(8, savedOnly);
            ps.setInt(9, validDays);
            return ps;
        }, keys);
        return Objects.requireNonNull(keys.getKey()).longValue();
    }

    public int revoke(long id, long ownerId) {
        return jdbc.update("""
            UPDATE agent_delegations SET status = 'REVOKED', revoked_at = NOW()
            WHERE id = ? AND owner_user_id = ? AND status = 'ACTIVE'
            """, id, ownerId);
    }

    /** Fare already committed by this assistant in the last 24 hours (live holds and confirmed bookings). */
    public int spentLast24h(long delegationId) {
        Long sum = jdbc.queryForObject("""
            SELECT COALESCE(SUM(total_fare_paise), 0) FROM bookings
            WHERE created_by_delegation_id = ?
              AND created_at >= NOW() - INTERVAL 24 HOUR
              AND (status = 'CONFIRMED' OR (status = 'PENDING_PAYMENT' AND hold_expires_at > NOW()))
            """, Long.class, delegationId);
        return sum == null ? 0 : sum.intValue();
    }

    public void insertAction(long delegationId, String actor, String method, String path, String query,
                             Integer statusCode, String summary) {
        jdbc.update("""
            INSERT INTO agent_actions (delegation_id, actor, method, path, query, status_code, summary)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, delegationId, actor, method, trim(path, 200), trim(query, 500), statusCode, trim(summary, 500));
    }

    public List<ActionResponse> listActions(long delegationId, int limit, int offset) {
        return jdbc.query("""
            SELECT id, actor, method, path, query, status_code, summary, created_at
            FROM agent_actions WHERE delegation_id = ? ORDER BY id DESC LIMIT ? OFFSET ?
            """,
            (rs, i) -> new ActionResponse(rs.getLong("id"), rs.getString("actor"), rs.getString("method"),
                    rs.getString("path"), rs.getString("query"), rs.getObject("status_code", Integer.class),
                    rs.getString("summary"), rs.getTimestamp("created_at").toInstant()),
            delegationId, limit, offset);
    }

    public long countActions(long delegationId) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM agent_actions WHERE delegation_id = ?",
                Long.class, delegationId);
        return n == null ? 0 : n;
    }

    private static String trim(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}