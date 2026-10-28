package com.droptechnologies.railyatra.booking.dto;

import java.time.Instant;
import java.util.List;

public record TicketResponse(BookingResponse booking, Instant bookedAt, PaymentInfo payment,
                             List<RefundInfo> refunds) {

    public record PaymentInfo(int amountPaise, Instant paidAt) {}

    public record RefundInfo(String reason, int amountPaise, String status) {}
}