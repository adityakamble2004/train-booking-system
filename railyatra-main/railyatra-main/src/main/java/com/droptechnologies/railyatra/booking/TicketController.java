package com.droptechnologies.railyatra.booking;

import com.droptechnologies.railyatra.booking.dto.TicketResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/bookings")
public class TicketController {

    private final TicketService service;

    public TicketController(TicketService service) {
        this.service = service;
    }

    @GetMapping("/{pnr}/ticket")
    public TicketResponse ticket(@AuthenticationPrincipal Jwt jwt, @PathVariable String pnr) {
        return service.get(Long.parseLong(jwt.getSubject()), pnr);
    }
}