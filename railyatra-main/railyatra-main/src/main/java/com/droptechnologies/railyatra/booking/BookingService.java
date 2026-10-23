package com.droptechnologies.railyatra.booking;

import com.droptechnologies.railyatra.booking.BookingRepository.FareRule;
import com.droptechnologies.railyatra.booking.BookingRepository.JourneyClassRef;
import com.droptechnologies.railyatra.booking.BookingRepository.NewBooking;
import com.droptechnologies.railyatra.booking.SeatAllocator.FreeSeat;
import com.droptechnologies.railyatra.booking.dto.BookingResponse;
import com.droptechnologies.railyatra.booking.dto.CreateBookingRequest;
import com.droptechnologies.railyatra.booking.dto.CreateBookingRequest.PassengerInput;
import com.droptechnologies.railyatra.common.error.ApiException;
import com.droptechnologies.railyatra.integration.PublicServerClient;
import com.droptechnologies.railyatra.integration.ScheduleDto;
import com.droptechnologies.railyatra.integration.ScheduleDto.StopDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class BookingService {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Pattern KEY = Pattern.compile("^[A-Za-z0-9_-]{8,64}$");

    public record Result(BookingResponse booking, boolean replayed) {}

    private final BookingRepository repo;
    private final PublicServerClient publicServer;
    private final TransactionTemplate tx;
    private final int holdMinutes;

    public BookingService(BookingRepository repo, PublicServerClient publicServer,
                          PlatformTransactionManager txManager,
                          @Value("${app.booking.hold-minutes:10}") int holdMinutes) {
        this.repo = repo;
        this.publicServer = publicServer;
        this.tx = new TransactionTemplate(txManager);
        this.holdMinutes = holdMinutes;
    }

    public Result create(long userId, String key, CreateBookingRequest r) {
        if (key == null || !KEY.matcher(key).matches()) {
            throw bad("INVALID_IDEMPOTENCY_KEY",
                    "Send a unique Idempotency-Key header (8 to 64 letters, digits, - or _)");
        }
        Optional<BookingResponse> existing = repo.findByIdempotencyKey(userId, key);
        if (existing.isPresent()) {
            return new Result(existing.get(), true);
        }

        String trainNo = r.trainNo().trim();
        String fromCode = r.fromStation().trim().toUpperCase(Locale.ROOT);
        String toCode = r.toStation().trim().toUpperCase(Locale.ROOT);
        String classCode = r.classCode();

        if (fromCode.equals(toCode)) {
            throw bad("SAME_STATION", "Source and destination must be different");
        }
        if (r.journeyDate().isBefore(LocalDate.now(IST))) {
            throw bad("VALIDATION_FAILED", "Journey date cannot be in the past");
        }

        JourneyClassRef journey = repo.findJourneyClass(trainNo, r.journeyDate(), classCode)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "JOURNEY_NOT_OPEN",
                        "This train is not open for booking on that date"));
        if (!"OPEN".equals(journey.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "JOURNEY_CLOSED", "Booking is closed for this journey");
        }
        if (journey.classId() == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CLASS_NOT_AVAILABLE",
                    "Class " + classCode + " is not available on this train");
        }

        ScheduleDto schedule = publicServer.scheduleCached(trainNo);
        StopDto from = schedule.stops().stream()
                .filter(s -> fromCode.equalsIgnoreCase(s.stationCode())).findFirst()
                .orElseThrow(BookingService::notOnRoute);
        StopDto to = schedule.stops().stream()
                .filter(s -> toCode.equalsIgnoreCase(s.stationCode()) && s.order() > from.order()).findFirst()
                .orElseThrow(BookingService::notOnRoute);

        FareRule fare = repo.findFareRule(classCode).orElseThrow(
                () -> bad("VALIDATION_FAILED", "No fare configured for class " + classCode));
        int farePerSeat = fare.basePaise() + fare.perStopPaise() * (to.order() - from.order());
        int passengersCount = r.passengers().size();
        List<String> preferences = r.passengers().stream().map(PassengerInput::berthPreference).toList();

        String pnr = newPnr();
        long classId = journey.classId();

        try {
            tx.executeWithoutResult(status -> {
                repo.lockJourneyClass(classId);              // FIRST statement: queue behind other bookings

                List<FreeSeat> free = repo.freeSeats(classId, from.order(), to.order());
                if (free.size() < passengersCount) {
                    throw new ApiException(HttpStatus.CONFLICT, "SEATS_UNAVAILABLE",
                            free.isEmpty() ? "No seats left in this class"
                                    : "Only " + free.size() + " seat(s) left in this class");
                }
                List<FreeSeat> seats = SeatAllocator.pick(free, preferences);

                long bookingId = repo.insertBooking(new NewBooking(pnr, userId, journey.journeyId(), classCode,
                        from.stationCode(), from.stationName(), from.order(), from.departure(),
                        to.stationCode(), to.stationName(), to.order(), to.arrival(),
                        farePerSeat * passengersCount, r.contactEmail().trim().toLowerCase(Locale.ROOT),
                        blankToNull(r.contactPhone()), holdMinutes, key));

                for (int i = 0; i < passengersCount; i++) {
                    PassengerInput p = r.passengers().get(i);
                    FreeSeat seat = seats.get(i);
                    int age = Period.between(p.dateOfBirth(), r.journeyDate()).getYears();
                    long passengerId = repo.insertPassenger(bookingId, p.name().trim(), p.dateOfBirth(), age,
                            p.gender(), p.berthPreference(), seat);
                    repo.insertAllocation(seat.id(), bookingId, passengerId, from.order(), to.order(), holdMinutes);
                }
            });
        } catch (DuplicateKeyException e) {
            // two identical requests raced; hand back the one that won
            return repo.findByIdempotencyKey(userId, key).map(b -> new Result(b, true))
                    .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "BOOKING_CONFLICT",
                            "Please try again"));
        }

        BookingResponse created = repo.findByPnr(userId, pnr).orElseThrow();
        return new Result(created, false);
    }

    public BookingResponse get(long userId, String pnr) {
        if (!pnr.matches("^[0-9]{10}$")) {
            throw notFound();
        }
        return repo.findByPnr(userId, pnr).orElseThrow(BookingService::notFound);
    }

    private String newPnr() {
        for (int i = 0; i < 5; i++) {
            String pnr = String.valueOf(RANDOM.nextLong(1_000_000_000L, 10_000_000_000L));
            if (!repo.pnrExists(pnr)) {
                return pnr;
            }
        }
        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SERVER_BUSY", "Please try again");
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static ApiException bad(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message);
    }

    private static ApiException notOnRoute() {
        return bad("STATIONS_NOT_ON_ROUTE", "This train does not run between those stations in that direction");
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND", "Booking not found");
    }
}