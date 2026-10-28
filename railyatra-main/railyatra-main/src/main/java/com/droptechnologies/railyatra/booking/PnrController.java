package com.droptechnologies.railyatra.booking;

import com.droptechnologies.railyatra.booking.dto.PnrStatusResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pnr")
public class PnrController {

    private final PnrService service;

    public PnrController(PnrService service) {
        this.service = service;
    }

    @GetMapping("/{pnr}")
    public PnrStatusResponse status(@PathVariable String pnr, HttpServletRequest req) {
        return service.status(pnr, req.getRemoteAddr());
    }
}