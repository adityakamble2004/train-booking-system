
package com.droptechnologies.railyatra.booking;

import com.droptechnologies.railyatra.booking.dto.BookingResponse;
import com.droptechnologies.railyatra.booking.dto.BookingSummary;
import com.droptechnologies.railyatra.booking.dto.CreateBookingRequest;
import com.droptechnologies.railyatra.common.dto.PageResponse;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/bookings")
public class BookingController {

    private final BookingService service;

    public BookingController(BookingService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<BookingResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader(name = "Idempotency-Key", required = false)
            String idempotencyKey,
            @Valid @RequestBody CreateBookingRequest body) {

        // Read delegation ID from JWT
        String d = jwt.getClaimAsString("delegation_id");
        Long delegationId = (d == null || d.isBlank())
                ? null
                : Long.valueOf(d);

        // Create booking
        BookingService.Result result = service.create(
                Long.parseLong(jwt.getSubject()),
                delegationId,
                idempotencyKey,
                body
        );

        return ResponseEntity
                .status(result.replayed()
                        ? HttpStatus.OK
                        : HttpStatus.CREATED)
                .body(result.booking());
    }

    @GetMapping("/{pnr}")
    public BookingResponse get(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String pnr) {

        return service.get(
                Long.parseLong(jwt.getSubject()), pnr);
    }

    // List bookings with pagination
    @GetMapping
    public PageResponse<BookingSummary> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        return service.list(
                Long.parseLong(jwt.getSubject()), page, size);
    }

    // Cancel a booking
    @PostMapping("/{pnr}/cancel")
    public BookingResponse cancel(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String pnr) {

        return service.cancel(
                Long.parseLong(jwt.getSubject()), pnr);
    }
}
