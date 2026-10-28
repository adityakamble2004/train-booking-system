package com.droptechnologies.railyatra.booking;

import com.droptechnologies.railyatra.booking.dto.BookingResponse;
import com.droptechnologies.railyatra.booking.dto.PnrStatusResponse;
import com.droptechnologies.railyatra.common.error.ApiException;
import com.droptechnologies.railyatra.common.ratelimit.RateLimiter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PnrService {

    private final BookingRepository repo;
    private final RateLimiter limiter;
    private final int perMinute;

    public PnrService(BookingRepository repo, RateLimiter limiter,
                      @Value("${app.pnr.rate-limit-per-minute:20}") int perMinute) {
        this.repo = repo;
        this.limiter = limiter;
        this.perMinute = perMinute;
    }

    public PnrStatusResponse status(String pnr, String clientIp) {
        if (!limiter.allow("pnr:" + clientIp, perMinute, Duration.ofMinutes(1))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                    "Too many PNR checks. Try again in a minute.");
        }
        if (!pnr.matches("^[0-9]{10}$")) {
            throw notFound();
        }
        BookingResponse b = repo.findByPnrInternal(pnr).orElseThrow(PnrService::notFound);

        List<PnrStatusResponse.Passenger> passengers = b.passengers().stream()
                .map(p -> new PnrStatusResponse.Passenger(mask(p.name()), p.status(), p.coach(), p.seatNo(), p.berth()))
                .toList();
        return new PnrStatusResponse(b.pnr(), b.status(), b.trainNo(), b.trainName(), b.journeyDate(),
                b.classCode(), b.from(), b.to(), passengers);
    }

    /** "Aditya Kamble" becomes "A*** K***". */
    static String mask(String name) {
        return Arrays.stream(name.trim().split("\\s+"))
                .filter(w -> !w.isEmpty())
                .map(w -> w.substring(0, 1) + "***")
                .collect(Collectors.joining(" "));
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "PNR_NOT_FOUND", "PNR not found");
    }
}