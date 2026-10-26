package com.droptechnologies.railyatra.booking;

import com.droptechnologies.railyatra.booking.SeatAllocator.FreeSeat; import com.droptechnologies.railyatra.booking.dto.BookingResponse; import com.droptechnologies.railyatra.booking.dto.BookingResponse.PassengerSeat; import com.droptechnologies.railyatra.booking.dto.BookingResponse.Stop; import com.droptechnologies.railyatra.booking.dto.BookingSummary; import org.springframework.jdbc.core.JdbcTemplate; import org.springframework.jdbc.support.GeneratedKeyHolder; import org.springframework.jdbc.support.KeyHolder; import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement; import java.sql.Statement; import java.time.LocalDate; import java.util.ArrayList; import java.util.List; import java.util.Objects; import java.util.Optional;

@Repository public class BookingRepository {

public record JourneyClassRef(long journeyId, String status, Long classId) {}

public record FareRule(int basePaise, int perStopPaise) {}

public record NewBooking(String pnr, long userId, long journeyId, String classCode,
                         String fromCode, String fromName, int fromSeq, String departure,
                         String toCode, String toName, int toSeq, String arrival,
                         int totalFarePaise, String email, String phone, int holdMinutes,
                         String idempotencyKey) {}

public record BookingRow(long id, long userId, String status, boolean holdExpired,
                         int totalFarePaise, LocalDate journeyDate,
                         String departureTime, int passengerCount) {}

private record Head(long id, BookingResponse response) {}

private static final String BOOKING_SELECT = """
    SELECT b.id, b.pnr,
           CASE WHEN b.status = 'PENDING_PAYMENT' AND b.hold_expires_at <= NOW()
                THEN 'EXPIRED' ELSE b.status END AS status,
           j.train_no, j.train_name, j.journey_date, b.class_code,
           b.from_station_code, b.from_station_name, b.departure_time,
           b.to_station_code, b.to_station_name, b.arrival_time,
           b.total_fare_paise, b.refund_paise, b.contact_email,
           CASE WHEN b.status = 'PENDING_PAYMENT' AND b.hold_expires_at > NOW()
                THEN TIMESTAMPDIFF(SECOND, NOW(), b.hold_expires_at) ELSE 0 END AS hold_left
    FROM bookings b
    JOIN journeys j ON j.id = b.journey_id
    """;

private final JdbcTemplate jdbc;

public BookingRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
}

// ---------- lookups before the transaction ----------

public Optional<JourneyClassRef> findJourneyClass(
        String trainNo, LocalDate date, String classCode) {

    return jdbc.query("""
        SELECT j.id, j.status, jc.id AS class_id
        FROM journeys j
        LEFT JOIN journey_classes jc
            ON jc.journey_id = j.id
            AND jc.class_code = ?
        WHERE j.train_no = ?
          AND j.journey_date = ?
        """,
        (rs, i) -> new JourneyClassRef(
                rs.getLong("id"),
                rs.getString("status"),
                rs.getObject("class_id", Long.class)
        ),
        classCode, trainNo, date
    ).stream().findFirst();
}

public Optional<FareRule> findFareRule(String classCode) {
    return jdbc.query(
            "SELECT base_paise, per_stop_paise FROM fare_rules WHERE class_code = ?",
            (rs, i) -> new FareRule(
                    rs.getInt("base_paise"),
                    rs.getInt("per_stop_paise")
            ),
            classCode
    ).stream().findFirst();
}

public boolean pnrExists(String pnr) {
    Integer n = jdbc.queryForObject(
            "SELECT COUNT(*) FROM bookings WHERE pnr = ?",
            Integer.class, pnr
    );
    return n != null && n > 0;
}

public Optional<Long> findClassIdByPnr(String pnr) {
    return jdbc.query("""
        SELECT jc.id FROM bookings b
        JOIN journey_classes jc ON jc.journey_id = b.journey_id AND jc.class_code = b.class_code
        WHERE b.pnr = ?
        """, (rs, i) -> rs.getLong("id"), pnr).stream().findFirst();
}

// ---------- inside the transaction ----------

/** Must be the FIRST statement of the booking transaction. */
public void lockJourneyClass(long classId) {
    jdbc.queryForObject(
            "SELECT id FROM journey_classes WHERE id = ? FOR UPDATE",
            Long.class, classId
    );
}

/** Locking read of the booking row. Call only after lockJourneyClass. */
public Optional<BookingRow> lockBooking(String pnr) {
    return jdbc.query("""
        SELECT b.id, b.user_id, b.status,
               (b.hold_expires_at IS NOT NULL AND b.hold_expires_at <= NOW()) AS hold_expired,
               b.total_fare_paise, j.journey_date, b.departure_time,
               (SELECT COUNT(*) FROM booking_passengers bp WHERE bp.booking_id = b.id) AS passenger_count
        FROM bookings b
        JOIN journeys j ON j.id = b.journey_id
        WHERE b.pnr = ?
        FOR UPDATE OF b
        """,
        (rs, i) -> new BookingRow(
                rs.getLong("id"),
                rs.getLong("user_id"),
                rs.getString("status"),
                rs.getBoolean("hold_expired"),
                rs.getInt("total_fare_paise"),
                rs.getObject("journey_date", LocalDate.class),
                rs.getString("departure_time"),
                rs.getInt("passenger_count")
        ),
        pnr
    ).stream().findFirst();
}

public List<FreeSeat> freeSeats(long classId, int fromSeq, int toSeq) {
    return jdbc.query("""
        SELECT s.id, s.coach_no, s.seat_no, s.berth_type
        FROM seats s
        WHERE s.journey_class_id = ?
          AND NOT EXISTS (
              SELECT 1 FROM seat_allocations a
              WHERE a.seat_id = s.id
                AND a.from_seq < ? AND a.to_seq > ?
                AND (
                    a.status = 'CONFIRMED'
                    OR (a.status = 'HELD' AND a.expires_at > NOW())
                )
          )
        """,
        (rs, i) -> new FreeSeat(
                rs.getLong("id"),
                rs.getString("coach_no"),
                rs.getInt("seat_no"),
                rs.getString("berth_type")
        ),
        classId, toSeq, fromSeq
    );
}

public long insertBooking(NewBooking b) {
    return insertReturningId("""
        INSERT INTO bookings (pnr, user_id, journey_id, class_code,
                              from_station_code, from_station_name, from_seq, departure_time,
                              to_station_code, to_station_name, to_seq, arrival_time,
                              status, total_fare_paise, contact_email, contact_phone,
                              hold_expires_at, idempotency_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_PAYMENT', ?, ?, ?,
                DATE_ADD(NOW(), INTERVAL ? MINUTE), ?)
        """,
            b.pnr(), b.userId(), b.journeyId(), b.classCode(),
            b.fromCode(), b.fromName(), b.fromSeq(), b.departure(),
            b.toCode(), b.toName(), b.toSeq(), b.arrival(),
            b.totalFarePaise(), b.email(), b.phone(),
            b.holdMinutes(), b.idempotencyKey()
    );
}

public long insertPassenger(long bookingId, String name, LocalDate dob,
                            int ageAtJourney, String gender,
                            String berthPreference, FreeSeat seat) {
    return insertReturningId("""
        INSERT INTO booking_passengers
            (booking_id, name, date_of_birth, age_at_journey, gender, berth_preference,
             status, coach_no, seat_no, berth_type)
        VALUES (?, ?, ?, ?, ?, ?, 'CNF', ?, ?, ?)
        """,
            bookingId, name, dob, ageAtJourney, gender, berthPreference,
            seat.coachNo(), seat.seatNo(), seat.berthType()
    );
}

public void insertAllocation(long seatId, long bookingId, long passengerId,
                             int fromSeq, int toSeq, int holdMinutes) {
    jdbc.update("""
        INSERT INTO seat_allocations
            (seat_id, booking_id, booking_passenger_id, from_seq, to_seq, status, expires_at)
        VALUES (?, ?, ?, ?, ?, 'HELD', DATE_ADD(NOW(), INTERVAL ? MINUTE))
        """,
            seatId, bookingId, passengerId, fromSeq, toSeq, holdMinutes
    );
}

public int confirmAllocations(long bookingId) {
    return jdbc.update("""
        UPDATE seat_allocations SET status = 'CONFIRMED', expires_at = NULL
        WHERE booking_id = ? AND status = 'HELD' AND expires_at > NOW()
        """, bookingId);
}

public void markConfirmed(long bookingId) {
    jdbc.update("""
        UPDATE bookings
        SET status = 'CONFIRMED', confirmed_at = NOW(), hold_expires_at = NULL
        WHERE id = ?
        """, bookingId);
}

public void releaseAllocations(long bookingId) {
    jdbc.update("""
        UPDATE seat_allocations SET status = 'RELEASED', expires_at = NULL
        WHERE booking_id = ? AND status IN ('HELD', 'CONFIRMED')
        """, bookingId);
}

public void cancelPassengers(long bookingId) {
    jdbc.update(
            "UPDATE booking_passengers SET status = 'CAN' WHERE booking_id = ?",
            bookingId
    );
}

public void markCancelled(long bookingId, int refundPaise) {
    jdbc.update("""
        UPDATE bookings
        SET status = 'CANCELLED', cancelled_at = NOW(),
            hold_expires_at = NULL, refund_paise = ?
        WHERE id = ?
        """, refundPaise, bookingId);
}

// ---------- reading bookings (always scoped to the user) ----------

public Optional<BookingResponse> findByPnr(long userId, String pnr) {
    return load(" WHERE b.user_id = ? AND b.pnr = ?", userId, pnr);
}

public Optional<BookingResponse> findByIdempotencyKey(long userId, String key) {
    return load(
            " WHERE b.user_id = ? AND b.idempotency_key = ?",
            userId, key
    );
}

public Optional<BookingResponse> findByPnrInternal(String pnr) {
    return load(" WHERE b.pnr = ?", pnr);
}

public List<BookingSummary> listForUser(long userId, int limit, int offset) {
    return jdbc.query("""
        SELECT b.pnr,
               CASE WHEN b.status = 'PENDING_PAYMENT' AND b.hold_expires_at <= NOW()
                    THEN 'EXPIRED' ELSE b.status END AS status,
               j.train_no, j.train_name, j.journey_date, b.class_code,
               b.from_station_code, b.from_station_name, b.to_station_code, b.to_station_name,
               b.total_fare_paise,
               (SELECT COUNT(*) FROM booking_passengers bp WHERE bp.booking_id = b.id) AS passenger_count
        FROM bookings b
        JOIN journeys j ON j.id = b.journey_id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC, b.id DESC
        LIMIT ? OFFSET ?
        """,
        (rs, i) -> new BookingSummary(
                rs.getString("pnr"),
                rs.getString("status"),
                rs.getString("train_no"),
                rs.getString("train_name"),
                rs.getObject("journey_date", LocalDate.class),
                rs.getString("class_code"),
                rs.getString("from_station_code"),
                rs.getString("from_station_name"),
                rs.getString("to_station_code"),
                rs.getString("to_station_name"),
                rs.getInt("total_fare_paise"),
                rs.getInt("passenger_count")
        ),
        userId, limit, offset
    );
}

public long countForUser(long userId) {
    Long n = jdbc.queryForObject(
            "SELECT COUNT(*) FROM bookings WHERE user_id = ?",
            Long.class, userId
    );
    return n == null ? 0 : n;
}

// ---- used by the expiry job ----

public int expireDueBookings() {
    return jdbc.update("""
        UPDATE bookings SET status = 'EXPIRED'
        WHERE status = 'PENDING_PAYMENT' AND hold_expires_at <= NOW()
        """);
}

public void releaseExpiredAllocations() {
    jdbc.update("""
        UPDATE seat_allocations a JOIN bookings b ON b.id = a.booking_id
        SET a.status = 'RELEASED', a.expires_at = NULL
        WHERE a.status = 'HELD' AND b.status = 'EXPIRED'
        """);
}

public void cancelExpiredPassengers() {
    jdbc.update("""
        UPDATE booking_passengers bp JOIN bookings b ON b.id = bp.booking_id
        SET bp.status = 'CAN'
        WHERE b.status = 'EXPIRED' AND bp.status = 'CNF'
        """);
}

public void markExpired(long bookingId) {
    jdbc.update("UPDATE bookings SET status = 'EXPIRED', hold_expires_at = NULL WHERE id = ?", bookingId);
}

private Optional<BookingResponse> load(String where, Object... args) {
    List<Head> heads = jdbc.query(BOOKING_SELECT + where,
            (rs, i) -> new Head(
                    rs.getLong("id"),
                    new BookingResponse(
                            rs.getString("pnr"),
                            rs.getString("status"),
                            rs.getString("train_no"),
                            rs.getString("train_name"),
                            rs.getObject("journey_date", LocalDate.class),
                            rs.getString("class_code"),
                            new Stop(
                                    rs.getString("from_station_code"),
                                    rs.getString("from_station_name"),
                                    rs.getString("departure_time")
                            ),
                            new Stop(
                                    rs.getString("to_station_code"),
                                    rs.getString("to_station_name"),
                                    rs.getString("arrival_time")
                            ),
                            rs.getInt("total_fare_paise"),
                            rs.getObject("refund_paise", Integer.class),
                            rs.getLong("hold_left"),
                            rs.getString("contact_email"),
                            new ArrayList<>()
                    )
            ),
            args
    );

    if (heads.isEmpty()) {
        return Optional.empty();
    }

    Head head = heads.get(0);

    head.response().passengers().addAll(jdbc.query("""
        SELECT name, age_at_journey, gender, status, coach_no, seat_no, berth_type
        FROM booking_passengers
        WHERE booking_id = ?
        ORDER BY id
        """,
            (rs, i) -> new PassengerSeat(
                    rs.getString("name"),
                    rs.getInt("age_at_journey"),
                    rs.getString("gender"),
                    rs.getString("status"),
                    rs.getString("coach_no"),
                    rs.getObject("seat_no", Integer.class),
                    rs.getString("berth_type")
            ),
            head.id()
    ));

    return Optional.of(head.response());
}

private long insertReturningId(String sql, Object... args) {
    KeyHolder keys = new GeneratedKeyHolder();

    jdbc.update(con -> {
        PreparedStatement ps = con.prepareStatement(
                sql, Statement.RETURN_GENERATED_KEYS
        );

        for (int i = 0; i < args.length; i++) {
            ps.setObject(i + 1, args[i]);
        }

        return ps;
    }, keys);

    return Objects.requireNonNull(keys.getKey()).longValue();
}


}