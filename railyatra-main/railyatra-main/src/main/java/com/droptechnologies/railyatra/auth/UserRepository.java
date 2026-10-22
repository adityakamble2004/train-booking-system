package com.droptechnologies.railyatra.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Objects;
import java.util.Optional;

@Repository
public class UserRepository {

    public record UserRow(long id, String email, String passwordHash, String role,
                          String status, boolean locked, String fullName) {}

    private static final String SELECT = """
        SELECT u.id, u.email, u.password_hash, u.role, u.status,
               (u.locked_until IS NOT NULL AND u.locked_until > NOW()) AS locked,
               COALESCE(p.full_name, '') AS full_name
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        """;

    private final JdbcTemplate jdbc;

    public UserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static UserRow map(ResultSet rs, int i) throws SQLException {
        return new UserRow(rs.getLong("id"), rs.getString("email"), rs.getString("password_hash"),
                rs.getString("role"), rs.getString("status"), rs.getBoolean("locked"),
                rs.getString("full_name"));
    }

    public Optional<UserRow> findByEmail(String email) {
        return jdbc.query(SELECT + " WHERE u.email = ?", UserRepository::map, email).stream().findFirst();
    }

    public Optional<UserRow> findById(long id) {
        return jdbc.query(SELECT + " WHERE u.id = ?", UserRepository::map, id).stream().findFirst();
    }

    public long insertUser(String email, String phone, String passwordHash) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO users (email, phone, password_hash) VALUES (?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, email);
            ps.setString(2, phone);
            ps.setString(3, passwordHash);
            return ps;
        }, keys);
        return Objects.requireNonNull(keys.getKey()).longValue();
    }

    public void insertProfile(long userId, String fullName) {
        jdbc.update("INSERT INTO user_profiles (user_id, full_name) VALUES (?, ?)", userId, fullName);
    }

    /** Assignment order matters here: MySQL evaluates SET left to right, so locked_until sees the OLD counter. */
    public void recordFailedLogin(long userId, int maxFails, int lockMinutes) {
        jdbc.update("""
            UPDATE users
            SET locked_until  = IF(failed_logins + 1 >= ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), locked_until),
                failed_logins = IF(failed_logins + 1 >= ?, 0, failed_logins + 1)
            WHERE id = ?
            """, maxFails, lockMinutes, maxFails, userId);
    }

    public void resetFailedLogins(long userId) {
        jdbc.update("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?", userId);
    }
    public void updatePasswordHash(long userId, String passwordHash) {
        jdbc.update("UPDATE users SET password_hash = ? WHERE id = ?", passwordHash, userId);
    }
}