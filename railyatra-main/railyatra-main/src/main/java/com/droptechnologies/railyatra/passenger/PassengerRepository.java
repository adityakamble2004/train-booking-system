package com.droptechnologies.railyatra.passenger;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
public class PassengerRepository {

    public record Row(long id, String name, LocalDate dateOfBirth, String gender,
                      String berthPreference, String idType, String idLast4) {}

    private static final String SELECT = """
        SELECT id, name, date_of_birth, gender, berth_preference, id_type, id_last4
        FROM saved_passengers
        """;

    private final JdbcTemplate jdbc;

    public PassengerRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static Row map(java.sql.ResultSet rs, int i) throws java.sql.SQLException {
        return new Row(rs.getLong("id"), rs.getString("name"), rs.getObject("date_of_birth", LocalDate.class),
                rs.getString("gender"), rs.getString("berth_preference"),
                rs.getString("id_type"), rs.getString("id_last4"));
    }

    public List<Row> list(long userId) {
        return jdbc.query(SELECT + " WHERE user_id = ? ORDER BY created_at, id", PassengerRepository::map, userId);
    }

    public Optional<Row> find(long userId, long id) {
        return jdbc.query(SELECT + " WHERE user_id = ? AND id = ?", PassengerRepository::map, userId, id)
                .stream().findFirst();
    }

    public int count(long userId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM saved_passengers WHERE user_id = ?", Integer.class, userId);
        return n == null ? 0 : n;
    }

    public long insert(long userId, String name, LocalDate dob, String gender,
                       String berth, String idType, String idLast4) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                INSERT INTO saved_passengers
                    (user_id, name, date_of_birth, gender, berth_preference, id_type, id_last4)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, userId);
            ps.setString(2, name);
            ps.setObject(3, dob);
            ps.setString(4, gender);
            ps.setString(5, berth);
            ps.setString(6, idType);
            ps.setString(7, idLast4);
            return ps;
        }, keys);
        return Objects.requireNonNull(keys.getKey()).longValue();
    }

    public int update(long userId, long id, String name, LocalDate dob, String gender,
                      String berth, String idType, String idLast4) {
        return jdbc.update("""
            UPDATE saved_passengers
            SET name = ?, date_of_birth = ?, gender = ?, berth_preference = ?, id_type = ?, id_last4 = ?
            WHERE user_id = ? AND id = ?
            """, name, dob, gender, berth, idType, idLast4, userId, id);
    }

    public int delete(long userId, long id) {
        return jdbc.update("DELETE FROM saved_passengers WHERE user_id = ? AND id = ?", userId, id);
    }
}