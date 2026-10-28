package com.droptechnologies.railyatra.booking;

import com.droptechnologies.railyatra.agent.DelegationPolicy;
import com.droptechnologies.railyatra.booking.BookingRepository.BookingRow;

import com.droptechnologies.railyatra.booking.BookingRepository.FareRule;

import com.droptechnologies.railyatra.booking.BookingRepository.JourneyClassRef;

import com.droptechnologies.railyatra.booking.BookingRepository.NewBooking;

import com.droptechnologies.railyatra.booking.SeatAllocator.FreeSeat;

import com.droptechnologies.railyatra.booking.dto.BookingResponse;

import com.droptechnologies.railyatra.booking.dto.BookingSummary;

import com.droptechnologies.railyatra.booking.dto.CreateBookingRequest;

import com.droptechnologies.railyatra.booking.dto.CreateBookingRequest.PassengerInput;

import com.droptechnologies.railyatra.common.dto.PageResponse;

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

import org.springframework.context.ApplicationEventPublisher;

import java.security.SecureRandom;

import java.time.Duration;

import java.time.LocalDate;

import java.time.LocalTime;

import java.time.Period;

import java.time.ZoneId;

import java.time.ZonedDateTime;

import java.time.format.DateTimeParseException;

import java.util.List;

import java.util.Locale;

import java.util.Optional;

import java.util.regex.Pattern;

@Service

public class BookingService {

	private final ApplicationEventPublisher events;
    private final DelegationPolicy policy;

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private static final SecureRandom RANDOM = new SecureRandom();

    private static final Pattern KEY = Pattern.compile("^[A-Za-z0-9_-]{8,64}$");

    public record Result(BookingResponse booking, boolean replayed) {}

    private final BookingRepository repo;

    private final PublicServerClient publicServer;

    private final TransactionTemplate tx;

    private final int holdMinutes;

    public enum ConfirmResult { CONFIRMED_NOW, ALREADY_CONFIRMED, HOLD_EXPIRED, NOT_CONFIRMABLE }

    public BookingService(BookingRepository repo, PublicServerClient publicServer,
                          PlatformTransactionManager txManager, ApplicationEventPublisher events,
                          DelegationPolicy policy,
                          @Value("${app.booking.hold-minutes:10}") int holdMinutes) {
        this.repo = repo;
        this.publicServer = publicServer;
        this.tx = new TransactionTemplate(txManager);
        this.events = events;
        this.policy = policy;
        this.holdMinutes = holdMinutes;
    }

    // ---------- create booking ----------

    public Result create(long userId, Long delegationId, String key, CreateBookingRequest r) {

        if (key == null || !KEY.matcher(key).matches()) {

            throw bad("INVALID_IDEMPOTENCY_KEY",

                    "Send a unique Idempotency-Key header (8 to 64 letters, digits, - or _)");

        }

        Optional<BookingResponse> existing =

                repo.findByIdempotencyKey(userId, key);

        if (existing.isPresent()) {

            return new Result(existing.get(), true);

        }

        String trainNo = r.trainNo().trim();

        String fromCode = r.fromStation().trim().toUpperCase(Locale.ROOT);

        String toCode = r.toStation().trim().toUpperCase(Locale.ROOT);

        String classCode = r.classCode();

        if (fromCode.equals(toCode)) {

            throw bad("SAME_STATION",

                    "Source and destination must be different");

        }

        if (r.journeyDate().isBefore(LocalDate.now(IST))) {

            throw bad("VALIDATION_FAILED",

                    "Journey date cannot be in the past");

        }

        JourneyClassRef journey = repo.findJourneyClass(

                        trainNo, r.journeyDate(), classCode)

                .orElseThrow(() -> new ApiException(

                        HttpStatus.NOT_FOUND,

                        "JOURNEY_NOT_OPEN",

                        "This train is not open for booking on that date"));

        if (!"OPEN".equals(journey.status())) {

            throw new ApiException(

                    HttpStatus.CONFLICT,

                    "JOURNEY_CLOSED",

                    "Booking is closed for this journey");

        }

        if (journey.classId() == null) {

            throw new ApiException(

                    HttpStatus.NOT_FOUND,

                    "CLASS_NOT_AVAILABLE",

                    "Class " + classCode + " is not available on this train");

        }

        ScheduleDto schedule = publicServer.scheduleCached(trainNo);

        StopDto from = schedule.stops().stream()

                .filter(s -> fromCode.equalsIgnoreCase(s.stationCode()))

                .findFirst()

                .orElseThrow(BookingService::notOnRoute);

        StopDto to = schedule.stops().stream()

                .filter(s -> toCode.equalsIgnoreCase(s.stationCode())

                        && s.order() > from.order())

                .findFirst()

                .orElseThrow(BookingService::notOnRoute);

        FareRule fare = repo.findFareRule(classCode)

                .orElseThrow(() -> bad(

                        "VALIDATION_FAILED",

                        "No fare configured for class " + classCode));

        int farePerSeat = fare.basePaise()

                + fare.perStopPaise() * (to.order() - from.order());

        int passengersCount = r.passengers().size();
        int totalFare = Math.multiplyExact(farePerSeat, passengersCount);
        if (delegationId != null) {
            policy.check(delegationId, userId, classCode, r.passengers(), totalFare);
        }

        List<String> preferences = r.passengers().stream()

                .map(PassengerInput::berthPreference)

                .toList();

        String pnr = newPnr();

        long classId = journey.classId();

        try {

            tx.executeWithoutResult(status -> {

                repo.lockJourneyClass(classId);

                List<FreeSeat> free = repo.freeSeats(

                        classId, from.order(), to.order());

                if (free.size() < passengersCount) {

                    throw new ApiException(

                            HttpStatus.CONFLICT,

                            "SEATS_UNAVAILABLE",

                            free.isEmpty()

                                    ? "No seats left in this class"

                                    : "Only " + free.size()

                                      + " seat(s) left in this class");

                }

                List<FreeSeat> seats =

                        SeatAllocator.pick(free, preferences);

                long bookingId = repo.insertBooking(

                        new NewBooking(

                                pnr,

                                userId,

                                journey.journeyId(),

                                classCode,

                                from.stationCode(),

                                from.stationName(),

                                from.order(),

                                from.departure(),

                                to.stationCode(),

                                to.stationName(),

                                to.order(),

                                to.arrival(),

                                totalFare,

                                r.contactEmail().trim().toLowerCase(Locale.ROOT),

                                blankToNull(r.contactPhone()),

                                holdMinutes,

                                key,
                                delegationId

                        ));

                for (int i = 0; i < passengersCount; i++) {

                    PassengerInput p = r.passengers().get(i);

                    FreeSeat seat = seats.get(i);

                    int age = Period.between(

                            p.dateOfBirth(), r.journeyDate()).getYears();

                    long passengerId = repo.insertPassenger(

                            bookingId,

                            p.name().trim(),

                            p.dateOfBirth(),

                            age,

                            p.gender(),

                            p.berthPreference(),

                            seat

                    );

                    repo.insertAllocation(

                            seat.id(),

                            bookingId,

                            passengerId,

                            from.order(),

                            to.order(),

                            holdMinutes

                    );

                }

            });

        } catch (DuplicateKeyException e) {

            return repo.findByIdempotencyKey(userId, key)

                    .map(b -> new Result(b, true))

                    .orElseThrow(() -> new ApiException(

                            HttpStatus.CONFLICT,

                            "BOOKING_CONFLICT",

                            "Please try again"));

        }

        BookingResponse created = repo.findByPnr(userId, pnr)

                .orElseThrow();

        return new Result(created, false);

    }

    // ---------- get booking ----------

    public BookingResponse get(long userId, String pnr) {

        if (pnr == null || !pnr.matches("^[0-9]{10}$")) {

            throw notFound();

        }

        return repo.findByPnr(userId, pnr)

                .orElseThrow(BookingService::notFound);

    }

    // ---------- confirm booking ----------

    // Called by payment or a development endpoint. Safe to call twice. \*/

    // Call inside a transaction. Business outcomes are returned, not thrown, so callers can still commit. \*/

    public ConfirmResult confirmWithinTransaction(String pnr) {

        Long classId = repo.findClassIdByPnr(pnr).orElse(null);

        if (classId == null) {

            return ConfirmResult.NOT_CONFIRMABLE;

        }

        repo.lockJourneyClass(classId);

        BookingRow b = repo.lockBooking(pnr).orElse(null);

        if (b == null) {

            return ConfirmResult.NOT_CONFIRMABLE;

        }

        if ("CONFIRMED".equals(b.status())) {

            return ConfirmResult.ALREADY_CONFIRMED;

        }

        if (!"PENDING_PAYMENT".equals(b.status())) {

            return ConfirmResult.NOT_CONFIRMABLE;

        }

        if (b.holdExpired()) {

            return ConfirmResult.HOLD_EXPIRED;

        }

        if (repo.confirmAllocations(b.id()) != b.passengerCount()) {

            // the hold lapsed in the last instant: clean up fully instead of leaving a half-confirmed booking

            repo.releaseAllocations(b.id());

            repo.cancelPassengers(b.id());

            repo.markExpired(b.id());

            return ConfirmResult.HOLD_EXPIRED;

        }

        repo.markConfirmed(b.id());

        return ConfirmResult.CONFIRMED_NOW;

    }

    // Used by the dev endpoint. 

    public BookingResponse confirm(String pnr) {

        ConfirmResult result = tx.execute(status -> confirmWithinTransaction(pnr));

        if (result == ConfirmResult.HOLD_EXPIRED) {

            throw new ApiException(HttpStatus.GONE, "HOLD_EXPIRED", "The seat hold has expired. Please book again.");

        }

        if (result == ConfirmResult.NOT_CONFIRMABLE) {

            throw new ApiException(HttpStatus.CONFLICT, "INVALID_BOOKING_STATE", "This booking cannot be confirmed");

        }

        return repo.findByPnrInternal(pnr).orElseThrow(BookingService::notFound);

    }

    // ---------- cancel booking ----------

    public BookingResponse cancel(long userId, String pnr) {

        // Verify that this booking belongs to the user.

        get(userId, pnr);

        Long classId = repo.findClassIdByPnr(pnr)

                .orElseThrow(BookingService::notFound);

        tx.executeWithoutResult(status -> {

            repo.lockJourneyClass(classId);

            BookingRow b = repo.lockBooking(pnr)

                    .orElseThrow(BookingService::notFound);

            if (b.userId() != userId) {

                throw notFound();

            }

            int refund;

            switch (b.status()) {

                case "CANCELLED" -> {

                    return;

                }

                case "PENDING_PAYMENT" -> refund = 0;

                case "CONFIRMED" -> {

                    Duration until = Duration.between(

                            ZonedDateTime.now(IST),

                            departureOf(b));

                    if (until.isNegative()) {

                        throw new ApiException(

                                HttpStatus.CONFLICT,

                                "TRAIN_DEPARTED",

                                "This train has already departed, so the booking can no longer be cancelled");

                    }

                    refund = RefundPolicy.refundPaise(

                            b.totalFarePaise(), until);

                }

                default -> throw new ApiException(

                        HttpStatus.CONFLICT,

                        "INVALID_BOOKING_STATE",

                        "This booking is "

                                + b.status().toLowerCase(Locale.ROOT)

                                + " and cannot be cancelled");

            }

            repo.releaseAllocations(b.id());

            repo.cancelPassengers(b.id());

            repo.markCancelled(b.id(), refund);

            if (refund > 0 && "CONFIRMED".equals(b.status())) {

                events.publishEvent(new BookingCancelledEvent(pnr, b.id(), refund));   // runs inside this transaction

            }

        });

        return get(userId, pnr);

    }

    // ---------- booking history with pagination ----------

    public PageResponse<BookingSummary> list(

            long userId, int page, int size) {

        int p = Math.max(page, 0);

        int s = Math.min(Math.max(size, 1), 50);

        return new PageResponse<>(

                repo.listForUser(userId, s, p * s),

                p,

                s,

                repo.countForUser(userId)

        );

    }

    // ---------- departure time ----------

    /*

     * Uses the boarding-station departure time on the journey date.

     * Ignores day offsets, so it is approximate for night trains.

     */

    private static ZonedDateTime departureOf(BookingRow b) {

        LocalTime time = LocalTime.MIDNIGHT;

        if (b.departureTime() != null) {

            try {

                time = LocalTime.parse(b.departureTime());

            } catch (DateTimeParseException ignored) {

                // Keep midnight if the departure time cannot be parsed.

            }

        }

        return ZonedDateTime.of(b.journeyDate(), time, IST);

    }

    // ---------- helpers ----------

    private String newPnr() {

        for (int i = 0; i < 5; i++) {

            String pnr = String.valueOf(

                    RANDOM.nextLong(1_000_000_000L, 10_000_000_000L));

            if (!repo.pnrExists(pnr)) {

                return pnr;

            }

        }

        throw new ApiException(

                HttpStatus.SERVICE_UNAVAILABLE,

                "SERVER_BUSY",

                "Please try again");

    }

    private static String blankToNull(String s) {

        return s == null || s.isBlank() ? null : s.trim();

    }

    private static ApiException bad(String code, String message) {

        return new ApiException(

                HttpStatus.BAD_REQUEST, code, message);

    }

    private static ApiException notOnRoute() {

        return bad(

                "STATIONS_NOT_ON_ROUTE",

                "This train does not run between those stations in that direction");

    }

    private static ApiException notFound() {

        return new ApiException(

                HttpStatus.NOT_FOUND,

                "BOOKING_NOT_FOUND",

                "Booking not found");

    }

}