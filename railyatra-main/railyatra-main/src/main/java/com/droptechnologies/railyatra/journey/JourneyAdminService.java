package com.droptechnologies.railyatra.journey;

import com.droptechnologies.railyatra.common.error.ApiException;
import com.droptechnologies.railyatra.integration.PublicServerClient;
import com.droptechnologies.railyatra.integration.ScheduleDto;
import com.droptechnologies.railyatra.journey.dto.JourneySummary;
import com.droptechnologies.railyatra.journey.dto.OpenJourneysRequest;
import com.droptechnologies.railyatra.journey.dto.OpenJourneysRequest.ClassSpec;
import com.droptechnologies.railyatra.journey.dto.OpenJourneysResponse;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class JourneyAdminService {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final int MAX_DAYS = 60;

    private final JourneyRepository journeys;
    private final PublicServerClient publicServer;
    private final TransactionTemplate tx;

    public JourneyAdminService(JourneyRepository journeys, PublicServerClient publicServer,
                               PlatformTransactionManager txManager) {
        this.journeys = journeys;
        this.publicServer = publicServer;
        this.tx = new TransactionTemplate(txManager);
    }

    /** Not @Transactional on purpose: the HTTP call to the public server must not hold a DB connection. */
    public OpenJourneysResponse open(OpenJourneysRequest r) {
        validate(r);
        String trainNo = r.trainNo().trim();
        ScheduleDto schedule = publicServer.schedule(trainNo);

        try {
            return tx.execute(status -> {
                List<LocalDate> skipped = new ArrayList<>();
                int created = 0;
                int seatsCreated = 0;

                for (LocalDate d = r.fromDate(); !d.isAfter(r.toDate()); d = d.plusDays(1)) {
                    if (journeys.exists(trainNo, d)) {
                        skipped.add(d);
                        continue;
                    }
                    long journeyId = journeys.insertJourney(trainNo, schedule.trainName(), d);
                    for (ClassSpec spec : r.classes()) {
                        var seats = SeatLayouts.generate(spec.classCode(), spec.coaches());
                        long classId = journeys.insertJourneyClass(journeyId, spec.classCode(), seats.size());
                        journeys.insertSeats(classId, seats);
                        seatsCreated += seats.size();
                    }
                    created++;
                }
                return new OpenJourneysResponse(trainNo, schedule.trainName(), created, skipped, seatsCreated);
            });
        } catch (DuplicateKeyException e) {
            throw new ApiException(HttpStatus.CONFLICT, "JOURNEY_EXISTS",
                    "Another request already opened one of these journeys. Try again.");
        }
    }

    public List<JourneySummary> list(String trainNo) {
        if (trainNo == null || trainNo.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MISSING_PARAMETER", "Missing parameter: trainNo");
        }
        return journeys.listUpcoming(trainNo.trim());
    }

    private static void validate(OpenJourneysRequest r) {
        LocalDate today = LocalDate.now(IST);
        if (r.fromDate().isBefore(today)) {
            throw bad("fromDate cannot be in the past");
        }
        if (r.toDate().isBefore(r.fromDate())) {
            throw bad("toDate must be on or after fromDate");
        }
        if (ChronoUnit.DAYS.between(r.fromDate(), r.toDate()) >= MAX_DAYS) {
            throw bad("You can open at most " + MAX_DAYS + " days at a time");
        }
        Set<String> seen = new HashSet<>();
        for (ClassSpec c : r.classes()) {
            if (!SeatLayouts.supports(c.classCode())) {
                throw bad("Unknown travel class: " + c.classCode());
            }
            if (!seen.add(c.classCode())) {
                throw bad("Class listed twice: " + c.classCode());
            }
        }
    }

    private static ApiException bad(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message);
    }
}