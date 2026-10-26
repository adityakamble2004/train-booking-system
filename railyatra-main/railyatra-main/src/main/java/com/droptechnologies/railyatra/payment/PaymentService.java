package com.droptechnologies.railyatra.payment;

import com.droptechnologies.railyatra.booking.BookingCancelledEvent;
import com.droptechnologies.railyatra.booking.BookingService;
import com.droptechnologies.railyatra.booking.BookingService.ConfirmResult;
import com.droptechnologies.railyatra.common.error.ApiException;
import com.droptechnologies.railyatra.payment.PaymentRepository.BookingForPayment;
import com.droptechnologies.railyatra.payment.PaymentRepository.PaymentRow;
import com.droptechnologies.railyatra.payment.dto.PaymentOrderResponse;
import com.droptechnologies.railyatra.payment.gateway.PaymentGateway;
import com.droptechnologies.railyatra.payment.gateway.PaymentGateway.GatewayEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository repo;
    private final PaymentGateway gateway;
    private final BookingService bookings;
    private final TransactionTemplate tx;

    public PaymentService(PaymentRepository repo, PaymentGateway gateway, BookingService bookings,
                          PlatformTransactionManager txManager) {
        this.repo = repo;
        this.gateway = gateway;
        this.bookings = bookings;
        this.tx = new TransactionTemplate(txManager);
    }

    public PaymentOrderResponse createPayment(long userId, String pnr) {
        if (!pnr.matches("^[0-9]{10}$")) {
            throw notFound();
        }
        BookingForPayment b = repo.findBookingForPayment(userId, pnr).orElseThrow(PaymentService::notFound);
        if (!"PENDING_PAYMENT".equals(b.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_BOOKING_STATE",
                    "This booking is not waiting for payment");
        }
        if (!b.holdAlive()) {
            throw new ApiException(HttpStatus.GONE, "HOLD_EXPIRED", "The seat hold has expired. Please book again.");
        }
        String orderId = gateway.createOrder(pnr, b.totalFarePaise());
        long paymentId = repo.insertPayment(b.id(), gateway.name(), orderId, b.totalFarePaise());
        return new PaymentOrderResponse(paymentId, gateway.name(), orderId, b.totalFarePaise(), "INR",
                b.holdSecondsLeft());
    }

    public void handleWebhook(String rawBody, String signature) {
        if (signature == null || !gateway.verifyWebhook(rawBody, signature)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_SIGNATURE", "Invalid webhook signature");
        }
        GatewayEvent event;
        try {
            event = gateway.parseWebhook(rawBody);
        } catch (RuntimeException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", "Unreadable webhook body");
        }

        tx.executeWithoutResult(status -> {
            PaymentRow p = repo.lockByOrderId(event.orderId()).orElse(null);
            if (p == null) {
                log.warn("Webhook for unknown order {}", event.orderId());
                return;
            }
            if (!"CREATED".equals(p.status())) {
                return;                                   // duplicate delivery: already handled
            }
            if ("PAID".equals(event.type())) {
                repo.markPaid(p.id(), event.paymentId());
                ConfirmResult result = bookings.confirmWithinTransaction(p.pnr());
                if (result == ConfirmResult.ALREADY_CONFIRMED) {
                    repo.insertRefund(p.id(), p.bookingId(), p.amountPaise(), "DUPLICATE_PAYMENT");
                } else if (result != ConfirmResult.CONFIRMED_NOW) {
                    repo.insertRefund(p.id(), p.bookingId(), p.amountPaise(), "LATE_PAYMENT");
                }
            } else if ("FAILED".equals(event.type())) {
                repo.markFailed(p.id(), event.failureReason());
            }
        });
    }

    /** Runs inside the cancel transaction, so the refund record is saved atomically with the cancellation. */
    @EventListener
    public void onBookingCancelled(BookingCancelledEvent e) {
        repo.findConfirmingPayment(e.bookingId()).ifPresent(p ->
                repo.insertRefund(p.id(), e.bookingId(), Math.min(e.refundPaise(), p.amountPaise()), "CANCELLATION"));
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND", "Booking not found");
    }
}