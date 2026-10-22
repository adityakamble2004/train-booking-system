package com.droptechnologies.railyatra.passenger;

import com.droptechnologies.railyatra.common.error.ApiException;
import com.droptechnologies.railyatra.passenger.PassengerRepository.Row;
import com.droptechnologies.railyatra.passenger.dto.PassengerRequest;
import com.droptechnologies.railyatra.passenger.dto.PassengerResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.util.List;

@Service
public class PassengerService {

    private static final int MAX_PASSENGERS = 20;
    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private final PassengerRepository repo;

    public PassengerService(PassengerRepository repo) {
        this.repo = repo;
    }

    public List<PassengerResponse> list(long userId) {
        return repo.list(userId).stream().map(PassengerService::toResponse).toList();
    }

    public PassengerResponse create(long userId, PassengerRequest r) {
        checkIdPair(r);
        if (repo.count(userId) >= MAX_PASSENGERS) {
            throw new ApiException(HttpStatus.CONFLICT, "PASSENGER_LIMIT_REACHED",
                    "You can save up to " + MAX_PASSENGERS + " passengers");
        }
        long id = repo.insert(userId, r.name().trim(), r.dateOfBirth(), r.gender(),
                r.berthPreference(), r.idType(), r.idLast4());
        return toResponse(repo.find(userId, id).orElseThrow());
    }

    public PassengerResponse update(long userId, long id, PassengerRequest r) {
        checkIdPair(r);
        int rows = repo.update(userId, id, r.name().trim(), r.dateOfBirth(), r.gender(),
                r.berthPreference(), r.idType(), r.idLast4());
        if (rows == 0) {
            throw notFound();
        }
        return toResponse(repo.find(userId, id).orElseThrow(PassengerService::notFound));
    }

    public void delete(long userId, long id) {
        if (repo.delete(userId, id) == 0) {
            throw notFound();
        }
    }

    private static void checkIdPair(PassengerRequest r) {
        if ((r.idType() == null) != (r.idLast4() == null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED",
                    "Provide both ID type and last 4 digits, or neither");
        }
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "PASSENGER_NOT_FOUND", "Passenger not found");
    }

    private static PassengerResponse toResponse(Row row) {
        int age = Period.between(row.dateOfBirth(), LocalDate.now(IST)).getYears();
        return new PassengerResponse(row.id(), row.name(), row.dateOfBirth(), age, row.gender(),
                row.berthPreference(), row.idType(), row.idLast4());
    }
}