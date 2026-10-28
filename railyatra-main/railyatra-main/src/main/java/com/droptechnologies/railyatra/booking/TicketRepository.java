package com.droptechnologies.railyatra.booking;

import com.droptechnologies.railyatra.booking.dto.TicketResponse.PaymentInfo;
import com.droptechnologies.railyatra.booking.dto.TicketResponse.RefundInfo;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public class TicketRepository {

    public record Extras(long bookingId, Instant bookedAt) {}

    private final JdbcTemplate jdbc;

    public TicketRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Extras> findExtras(long userId, String pnr) {
        return jdbc.query("SELECT id, created_at FROM bookings WHERE pnr = ? AND user_id = ?",
                (rs, i) -> new Extras(rs.getLong("id"), rs.getTimestamp("created_at").toInstant()),
                pnr, userId).stream().findFirst();
    }

    /** The payment that actually bought the ticket, not one that was refunded as late or duplicate. */
    public Optional<PaymentInfo> findPayment(long bookingId) {
        return jdbc.query("""
            SELECT p.amount_paise, p.paid_at
            FROM payments p
            WHERE p.booking_id = ? AND p.status = 'PAID'
              AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.payment_id = p.id
                              AND r.reason IN ('LATE_PAYMENT', 'DUPLICATE_PAYMENT'))
            ORDER BY p.paid_at, p.id
            LIMIT 1
            """,
            (rs, i) -> new PaymentInfo(rs.getInt("amount_paise"), rs.getTimestamp("paid_at").toInstant()),
            bookingId).stream().findFirst();
    }

    public List<RefundInfo> findRefunds(long bookingId) {
        return jdbc.query("SELECT reason, amount_paise, status FROM refunds WHERE booking_id = ? ORDER BY id",
                (rs, i) -> new RefundInfo(rs.getString("reason"), rs.getInt("amount_paise"), rs.getString("status")),
                bookingId);
    }
}