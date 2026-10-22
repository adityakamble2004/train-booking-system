
package com.Droptechnologyes.train.Booking;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/trains")
@CrossOrigin(origins = "http://localhost:5173")
public class TrainController {

    private final JdbcTemplate jdbcTemplate;

    public TrainController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/search")
    public List<TrainSearchResult> searchTrains(
            @RequestParam String from,
            @RequestParam String to) {

        if (from == null || from.isBlank()
                || to == null || to.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Source and destination are required"
            );
        }

        if (from.trim().equalsIgnoreCase(to.trim())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Source and destination must be different"
            );
        }

        String sql = """
            SELECT
                r1.train_no AS train_no,
                COALESCE(
                    MAX(m.train_name),
                    CONCAT('Train ', r1.train_no)
                ) AS train_name,
                r1.station_name AS from_station,
                r1.departure_time AS departure_time,
                r2.station_name AS to_station,
                r2.arrival_time AS arrival_time
            FROM train_route_stops r1
            JOIN train_route_stops r2
                ON r1.train_no = r2.train_no
                AND r1.route_order < r2.route_order
            LEFT JOIN train_master_txt m
                ON TRIM(m.train_no) = TRIM(r1.train_no)
            WHERE LOWER(TRIM(r1.station_name)) = LOWER(TRIM(?))
              AND LOWER(TRIM(r2.station_name)) = LOWER(TRIM(?))
              AND NOT EXISTS (
                  SELECT 1
                  FROM train_route_stops earlier
                  WHERE earlier.train_no = r2.train_no
                    AND earlier.route_order > r1.route_order
                    AND earlier.route_order < r2.route_order
                    AND LOWER(TRIM(earlier.station_name))
                        = LOWER(TRIM(?))
              )
            GROUP BY
                r1.train_no,
                r1.route_order,
                r1.station_name,
                r1.departure_time,
                r2.station_name,
                r2.arrival_time
            ORDER BY train_name, from_station
            LIMIT 100
            """;

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new TrainSearchResult(
                        rs.getString("train_no"),
                        rs.getString("train_name"),
                        rs.getString("from_station"),
                        rs.getString("departure_time"),
                        rs.getString("to_station"),
                        rs.getString("arrival_time")
                ),
                from.trim(),
                to.trim(),
                to.trim()
        );
    }
    
    @GetMapping("/by-number")
    public List<TrainStopResult> getTrainByNumber(
            @RequestParam String trainNo) {

        String sql = """
            SELECT
                r.train_no AS train_no,
                COALESCE(
                    MAX(m.train_name),
                    CONCAT('Train ', r.train_no)
                ) AS train_name,
                r.route_order AS route_order,
                r.station_name AS station_name,
                r.arrival_time AS arrival_time,
                r.departure_time AS departure_time
            FROM train_route_stops r
            LEFT JOIN train_master_txt m
                ON TRIM(m.train_no) = TRIM(r.train_no)
            WHERE TRIM(r.train_no) = ?
            GROUP BY
                r.train_no,
                r.route_order,
                r.station_name,
                r.arrival_time,
                r.departure_time
            ORDER BY r.route_order
            """;

        return jdbcTemplate.query(
            sql,
            (rs, rowNum) -> new TrainStopResult(
                rs.getString("train_no"),
                rs.getString("train_name"),
                rs.getInt("route_order"),
                rs.getString("station_name"),
                rs.getString("arrival_time"),
                rs.getString("departure_time")
            ),
            trainNo.trim()
        );
    }
}
