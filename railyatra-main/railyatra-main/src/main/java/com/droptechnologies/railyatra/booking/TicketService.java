package com.droptechnologies.railyatra.booking;

import com.droptechnologies.railyatra.booking.TicketRepository.Extras;
import com.droptechnologies.railyatra.booking.dto.BookingResponse;
import com.droptechnologies.railyatra.booking.dto.TicketResponse;
import com.droptechnologies.railyatra.common.error.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class TicketService {

    private final BookingRepository bookings;
    private final TicketRepository tickets;

    public TicketService(BookingRepository bookings, TicketRepository tickets) {
        this.bookings = bookings;
        this.tickets = tickets;
    }

    public TicketResponse get(long userId, String pnr) {
        if (!pnr.matches("^[0-9]{10}$")) {
            throw notFound();
        }
        BookingResponse booking = bookings.findByPnr(userId, pnr).orElseThrow(TicketService::notFound);
        Extras extras = tickets.findExtras(userId, pnr).orElseThrow(TicketService::notFound);
        return new TicketResponse(booking, extras.bookedAt(),
                tickets.findPayment(extras.bookingId()).orElse(null),
                tickets.findRefunds(extras.bookingId()));
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND", "Booking not found");
    }
}