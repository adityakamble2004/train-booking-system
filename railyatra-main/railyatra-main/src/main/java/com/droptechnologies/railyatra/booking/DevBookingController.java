package com.droptechnologies.railyatra.booking;

import com.droptechnologies.railyatra.booking.dto.BookingResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** DEV ONLY: pretends payment succeeded. Exists only when app.dev.mock-payment=true. */
@RestController
@ConditionalOnProperty(name = "app.dev.mock-payment", havingValue = "true")
@RequestMapping("/api/v1/dev/bookings")
public class DevBookingController {

    private final BookingService service;

    public DevBookingController(BookingService service) {
        this.service = service;
    }

    @PostMapping("/{pnr}/confirm")
    public BookingResponse confirm(@AuthenticationPrincipal Jwt jwt, @PathVariable String pnr) {
        service.get(Long.parseLong(jwt.getSubject()), pnr);   // ownership check
        return service.confirm(pnr);
    }
}