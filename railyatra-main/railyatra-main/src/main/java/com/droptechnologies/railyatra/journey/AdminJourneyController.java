package com.droptechnologies.railyatra.journey;

import com.droptechnologies.railyatra.journey.dto.JourneySummary;
import com.droptechnologies.railyatra.journey.dto.OpenJourneysRequest;
import com.droptechnologies.railyatra.journey.dto.OpenJourneysResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/journeys")
public class AdminJourneyController {

    private final JourneyAdminService service;

    public AdminJourneyController(JourneyAdminService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<OpenJourneysResponse> open(@Valid @RequestBody OpenJourneysRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.open(body));
    }

    @GetMapping
    public List<JourneySummary> list(@RequestParam String trainNo) {
        return service.list(trainNo);
    }
}