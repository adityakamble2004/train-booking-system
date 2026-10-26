package com.droptechnologies.railyatra.payment;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
public class PaymentRepository {

    public record BookingForPayment(long id, int totalFarePaise, String status,
                                    boolean holdAlive, long holdSecondsLeft) {}

    public record PaymentRow(long id, long bookingId, String pnr, int amountPaise, String status) {}

    public record RefundJob(long id, String gatewayPaymentId, int amountPaise) {}

    private final JdbcTemplate jdbc;

    public PaymentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static PaymentRow mapPayment(ResultSet rs, int i) throws SQLException {
        return new PaymentRow(rs.getLong("id"), rs.getLong("booking_id"), rs.getString("pnr"),
                rs.getInt("amount_paise"), rs.getString("status"));
    }

    public Optional<BookingForPayment> findBookingForPayment(long userId, String pnr) {
        return jdbc.query("""
            SELECT id, total_fare_paise, status,
                   (hold_expires_at IS NOT NULL AND hold_expires_at > NOW()) AS hold_alive,
                   CASE WHEN hold_expires_at > NOW() THEN TIMESTAMPDIFF(SECOND, NOW(), hold_expires_at)
                        ELSE 0 END AS hold_left
            FROM bookings WHERE pnr = ? AND user_id = ?
            """,
            (rs, i) -> new BookingForPayment(rs.getLong("id"), rs.getInt("total_fare_paise"),
                    rs.getString("status"), rs.getBoolean("hold_alive"), rs.getLong("hold_left")),
            pnr, userId).stream().findFirst();
    }

    public long insertPayment(long bookingId, String gateway, String orderId, int amountPaise) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                INSERT INTO payments (booking_id, gateway, gateway_order_id, amount_paise) VALUES (?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, bookingId);
            ps.setString(2, gateway);
            ps.setString(3, orderId);
            ps.setInt(4, amountPaise);
            return ps;
        }, keys);
        return Objects.requireNonNull(keys.getKey()).longValue();
    }

    /** Locking read: serialises duplicate webhook deliveries for the same order. */
    public Optional<PaymentRow> lockByOrderId(String orderId) {
        return jdbc.query("""
            SELECT p.id, p.booking_id, b.pnr, p.amount_paise, p.status
            FROM payments p JOIN bookings b ON b.id = p.booking_id
            WHERE p.gateway_order_id = ?
            FOR UPDATE OF p
            """, PaymentRepository::mapPayment, orderId).stream().findFirst();
    }

    public void markPaid(long id, String gatewayPaymentId) {
        jdbc.update("""
            UPDATE payments SET status = 'PAID', gateway_payment_id = ?, paid_at = NOW()
            WHERE id = ? AND status = 'CREATED'
            """, gatewayPaymentId, id);
    }

    public void markFailed(long id, String reason) {
        jdbc.update("UPDATE payments SET status = 'FAILED', failure_reason = ? WHERE id = ? AND status = 'CREATED'",
                reason, id);
    }

    /** The paid payment that actually confirmed the booking (not one already refunded as a duplicate). */
    public Optional<PaymentRow> findConfirmingPayment(long bookingId) {
        return jdbc.query("""
            SELECT p.id, p.booking_id, b.pnr, p.amount_paise, p.status
            FROM payments p JOIN bookings b ON b.id = p.booking_id
            WHERE p.booking_id = ? AND p.status = 'PAID'
              AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.payment_id = p.id)
            ORDER BY p.paid_at, p.id
            LIMIT 1
            """, PaymentRepository::mapPayment, bookingId).stream().findFirst();
    }

    public void insertRefund(long paymentId, long bookingId, int amountPaise, String reason) {
        jdbc.update("INSERT INTO refunds (payment_id, booking_id, amount_paise, reason) VALUES (?, ?, ?, ?)",
                paymentId, bookingId, amountPaise, reason);
    }

    public List<RefundJob> pendingRefunds(int limit) {
        return jdbc.query("""
            SELECT r.id, p.gateway_payment_id, r.amount_paise
            FROM refunds r JOIN payments p ON p.id = r.payment_id
            WHERE r.status = 'PENDING'
            ORDER BY r.id
            LIMIT ?
            """,
            (rs, i) -> new RefundJob(rs.getLong("id"), rs.getString("gateway_payment_id"), rs.getInt("amount_paise")),
            limit);
    }

    public void markRefundProcessed(long id, String gatewayRefundId) {
        jdbc.update("""
            UPDATE refunds SET status = 'PROCESSED', gateway_refund_id = ?, processed_at = NOW()
            WHERE id = ? AND status = 'PENDING'
            """, gatewayRefundId, id);
    }
}