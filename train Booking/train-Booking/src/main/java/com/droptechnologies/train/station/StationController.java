package com.droptechnologies.train.station;

import com.droptechnologies.train.common.error.ApiException;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/stations")
@Validated
public class StationController {

    private final StationRepository repo;

    public StationController(StationRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/suggest")
    public List<StationSuggestion> suggest(
            @RequestParam @Size(max = 50, message = "Query too long") String q) {

        String query = q.trim();
        if (query.length() < 2) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "QUERY_TOO_SHORT",
                    "Type at least 2 characters");
        }
        return repo.suggest(query, 10);
    }
}