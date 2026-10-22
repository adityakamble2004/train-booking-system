package com.droptechnologies.train.train;

import com.droptechnologies.train.common.util.TimeUtil;
import com.droptechnologies.train.dto.FromStop;
import com.droptechnologies.train.dto.ScheduleStop;
import com.droptechnologies.train.dto.ToStop;
import com.droptechnologies.train.train.dto.TrainSearchResult;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class TrainRepository {

    private final JdbcTemplate jdbc;

    public TrainRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<TrainSearchResult> search(String fromCode, String toCode, int limit) {
        String sql = """
            SELECT r1.train_no,
                   COALESCE(MAX(m.train_name), CONCAT('Train ', r1.train_no)) AS train_name,
                   r1.station_code AS from_code, r1.station_name AS from_name,
                   r1.departure_time,
                   r2.station_code AS to_code, r2.station_name AS to_name,
                   r2.arrival_time
            FROM train_route_stops r1
            JOIN train_route_stops r2
                 ON r2.train_no = r1.train_no
                AND r2.route_order > r1.route_order
            LEFT JOIN train_master_txt m
                 ON m.train_no = r1.train_no
            WHERE r1.station_code = ?
              AND r2.station_code = ?
              AND NOT EXISTS (
                  SELECT 1 FROM train_route_stops e
                  WHERE e.train_no = r1.train_no
                    AND e.station_code = r2.station_code
                    AND e.route_order > r1.route_order
                    AND e.route_order < r2.route_order
              )
            GROUP BY r1.train_no, r1.route_order, r1.station_code, r1.station_name,
                     r1.departure_time, r2.route_order, r2.station_code,
                     r2.station_name, r2.arrival_time
            ORDER BY r1.departure_time, train_name
            LIMIT ?
            """;

        return jdbc.query(sql, (rs, i) -> new TrainSearchResult(
                rs.getString("train_no"),
                rs.getString("train_name"),
                new FromStop(rs.getString("from_code"), rs.getString("from_name"),
                        TimeUtil.clean(rs.getString("departure_time"))),
                new ToStop(rs.getString("to_code"), rs.getString("to_name"),
                        TimeUtil.clean(rs.getString("arrival_time")))),
                fromCode, toCode, limit);
    }

    public List<ScheduleStop> findStops(String trainNo) {
        return jdbc.query("""
            SELECT route_order, station_code, station_name, arrival_time, departure_time
            FROM train_route_stops
            WHERE train_no = ?
            ORDER BY route_order
            """,
            (rs, i) -> new ScheduleStop(
                    rs.getInt("route_order"),
                    rs.getString("station_code"),
                    rs.getString("station_name"),
                    TimeUtil.clean(rs.getString("arrival_time")),
                    TimeUtil.clean(rs.getString("departure_time"))),
            trainNo);
    }

    public Optional<String> findTrainName(String trainNo) {
        return jdbc.query(
                "SELECT train_name FROM train_master_txt WHERE train_no = ? LIMIT 1",
                (rs, i) -> rs.getString("train_name"), trainNo).stream().findFirst();
    }
}