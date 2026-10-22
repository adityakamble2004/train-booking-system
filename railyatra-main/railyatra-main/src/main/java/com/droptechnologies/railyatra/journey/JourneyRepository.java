
package com.droptechnologies.railyatra.journey;

import com.droptechnologies.railyatra.journey.SeatLayouts.SeatSpec;
import com.droptechnologies.railyatra.journey.dto.JourneySummary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Repository
public class JourneyRepository {

    private final JdbcTemplate jdbc;

    public JourneyRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // Stores basic journey information
    public record JourneyRow(long id, String trainName, String status) {}

    // Stores seat availability and fare information
    public record ClassRow(
            String classCode,
            int totalSeats,
            int available,
            int basePaise,
            int perStopPaise
    ) {}

    public boolean exists(String trainNo, LocalDate date) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM journeys WHERE train_no = ? AND journey_date = ?",
                Integer.class, trainNo, date);
        return n != null && n > 0;
    }

    public long insertJourney(String trainNo, String trainName, LocalDate date) {
        return insertReturningId(
                "INSERT INTO journeys (train_no, train_name, journey_date) VALUES (?, ?, ?)",
                trainNo, trainName, date);
    }

    public long insertJourneyClass(long journeyId, String classCode, int totalSeats) {
        return insertReturningId(
                "INSERT INTO journey_classes (journey_id, class_code, total_seats) VALUES (?, ?, ?)",
                journeyId, classCode, totalSeats);
    }

    public void insertSeats(long journeyClassId, List<SeatSpec> seats) {
        jdbc.batchUpdate(
                "INSERT INTO seats (journey_class_id, coach_no, seat_no, berth_type) VALUES (?, ?, ?, ?)",
                seats, 500, (ps, s) -> {
                    ps.setLong(1, journeyClassId);
                    ps.setString(2, s.coachNo());
                    ps.setInt(3, s.seatNo());
                    ps.setString(4, s.berthType());
                });
    }

    public List<JourneySummary> listUpcoming(String trainNo) {
        return jdbc.query("""
            SELECT j.id, j.train_no, j.train_name, j.journey_date, j.status,
                   jc.class_code, jc.total_seats
            FROM journeys j
            JOIN journey_classes jc ON jc.journey_id = j.id
            WHERE j.train_no = ? AND j.journey_date >= CURDATE()
            ORDER BY j.journey_date, jc.class_code
            """,
            (ResultSetExtractor<List<JourneySummary>>) rs -> {
                Map<Long, JourneySummary> byId = new LinkedHashMap<>();
                while (rs.next()) {
                    long id = rs.getLong("id");
                    JourneySummary summary = byId.computeIfAbsent(id, k -> {
                        try {
                            return new JourneySummary(
                                    id,
                                    rs.getString("train_no"),
                                    rs.getString("train_name"),
                                    rs.getObject("journey_date", LocalDate.class),
                                    rs.getString("status"),
                                    new ArrayList<>()
                            );
                        } catch (java.sql.SQLException e) {
                            throw new IllegalStateException(e);
                        }
                    });
                    summary.classes().add(new JourneySummary.ClassSeats(
                            rs.getString("class_code"),
                            rs.getInt("total_seats")));
                }
                return new ArrayList<>(byId.values());
            },
            trainNo);
    }

    // NEW METHOD 1: Find a journey by train number and date
    public Optional<JourneyRow> findJourney(String trainNo, LocalDate date) {
        return jdbc.query(
                """
                SELECT id, train_name, status
                FROM journeys
                WHERE train_no = ? AND journey_date = ?
                """,
                (rs, i) -> new JourneyRow(
                        rs.getLong("id"),
                        rs.getString("train_name"),
                        rs.getString("status")
                ),
                trainNo, date
        ).stream().findFirst();
    }

    // NEW METHOD 2: Count seats available for a journey segment
    public List<ClassRow> availability(long journeyId, int fromSeq, int toSeq) {
        return jdbc.query("""
            SELECT jc.class_code, jc.total_seats, fr.base_paise, fr.per_stop_paise,
                   (SELECT COUNT(*)
                    FROM seats s
                    WHERE s.journey_class_id = jc.id
                      AND NOT EXISTS (
                          SELECT 1
                          FROM seat_allocations a
                          WHERE a.seat_id = s.id
                            AND a.from_seq < ?
                            AND a.to_seq > ?
                            AND (
                                a.status = 'CONFIRMED'
                                OR (
                                    a.status = 'HELD'
                                    AND a.expires_at > NOW()
                                )
                            )
                      )) AS available
            FROM journey_classes jc
            JOIN fare_rules fr ON fr.class_code = jc.class_code
            WHERE jc.journey_id = ?
            ORDER BY jc.class_code
            """,
            (rs, i) -> new ClassRow(
                    rs.getString("class_code"),
                    rs.getInt("total_seats"),
                    rs.getInt("available"),
                    rs.getInt("base_paise"),
                    rs.getInt("per_stop_paise")
            ),
            toSeq, fromSeq, journeyId);
    }

    // NEW METHOD 3: Get future dates open for booking
    public List<LocalDate> openDates(String trainNo) {
        return jdbc.query("""
            SELECT journey_date
            FROM journeys
            WHERE train_no = ?
              AND status = 'OPEN'
              AND journey_date >= CURDATE()
            ORDER BY journey_date
            """,
            (rs, i) -> rs.getObject("journey_date", LocalDate.class),
            trainNo);
    }

    private long insertReturningId(String sql, Object... args) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    sql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < args.length; i++) {
                ps.setObject(i + 1, args[i]);
            }
            return ps;
        }, keys);
        return Objects.requireNonNull(keys.getKey()).longValue();
    }
}
