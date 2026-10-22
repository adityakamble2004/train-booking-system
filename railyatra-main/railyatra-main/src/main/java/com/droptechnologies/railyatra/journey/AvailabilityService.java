package com.droptechnologies.railyatra.journey;

import com.droptechnologies.railyatra.common.error.ApiException;
import com.droptechnologies.railyatra.integration.PublicServerClient;
import com.droptechnologies.railyatra.integration.ScheduleDto;
import com.droptechnologies.railyatra.integration.ScheduleDto.StopDto;
import com.droptechnologies.railyatra.journey.JourneyRepository.JourneyRow;
import com.droptechnologies.railyatra.journey.dto.AvailabilityResponse;
import com.droptechnologies.railyatra.journey.dto.AvailabilityResponse.ClassAvailability;
import com.droptechnologies.railyatra.journey.dto.AvailabilityResponse.StopInfo;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;

@Service
public class AvailabilityService {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private final JourneyRepository journeys;
    private final PublicServerClient publicServer;

    public AvailabilityService(JourneyRepository journeys, PublicServerClient publicServer) {
        this.journeys = journeys;
        this.publicServer = publicServer;
    }

    public AvailabilityResponse check(String trainNo, LocalDate date, String from, String to) {
        String no = trainNo.trim();
        String fromCode = from.trim().toUpperCase(Locale.ROOT);
        String toCode = to.trim().toUpperCase(Locale.ROOT);

        if (fromCode.equals(toCode)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SAME_STATION",
                    "Source and destination must be different");
        }
        if (date.isBefore(LocalDate.now(IST))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Date cannot be in the past");
        }

        JourneyRow journey = journeys.findJourney(no, date).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND, "JOURNEY_NOT_OPEN",
                        "This train is not open for booking on that date"));
        if (!"OPEN".equals(journey.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "JOURNEY_CLOSED", "Booking is closed for this journey");
        }

        ScheduleDto schedule = publicServer.scheduleCached(no);
        List<StopDto> stops = schedule.stops();

        StopDto fromStop = stops.stream()
                .filter(s -> fromCode.equalsIgnoreCase(s.stationCode()))
                .findFirst().orElseThrow(AvailabilityService::notOnRoute);
        StopDto toStop = stops.stream()
                .filter(s -> toCode.equalsIgnoreCase(s.stationCode()) && s.order() > fromStop.order())
                .findFirst().orElseThrow(AvailabilityService::notOnRoute);

        int stopsTravelled = toStop.order() - fromStop.order();
        List<ClassAvailability> classes = journeys.availability(journey.id(), fromStop.order(), toStop.order())
                .stream()
                .map(c -> new ClassAvailability(c.classCode(), c.totalSeats(), c.available(),
                        c.available() > 0 ? "AVAILABLE" : "SOLD_OUT",
                        c.basePaise() + c.perStopPaise() * stopsTravelled))
                .toList();

        return new AvailabilityResponse(no, journey.trainName(), date,
                new StopInfo(fromStop.stationCode(), fromStop.stationName(), fromStop.departure()),
                new StopInfo(toStop.stationCode(), toStop.stationName(), toStop.arrival()),
                classes);
    }

    public List<LocalDate> openDates(String trainNo) {
        if (trainNo == null || trainNo.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MISSING_PARAMETER", "Missing parameter: trainNo");
        }
        return journeys.openDates(trainNo.trim());
    }

    private static ApiException notOnRoute() {
        return new ApiException(HttpStatus.BAD_REQUEST, "STATIONS_NOT_ON_ROUTE",
                "This train does not run between those stations in that direction");
    }
}