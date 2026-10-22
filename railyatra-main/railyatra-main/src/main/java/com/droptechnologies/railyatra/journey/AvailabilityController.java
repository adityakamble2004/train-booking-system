package com.droptechnologies.railyatra.journey;

import com.droptechnologies.railyatra.journey.dto.AvailabilityResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class AvailabilityController {

    private final AvailabilityService service;

    public AvailabilityController(AvailabilityService service) {
        this.service = service;
    }

    @GetMapping("/availability")
    public AvailabilityResponse availability(
            @RequestParam String trainNo,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String from,
            @RequestParam String to) {
        return service.check(trainNo, date, from, to);
    }

    @GetMapping("/journeys/open-dates")
    public List<LocalDate> openDates(@RequestParam String trainNo) {
        return service.openDates(trainNo);
    }
}