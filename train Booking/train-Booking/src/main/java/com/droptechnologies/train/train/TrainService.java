package com.droptechnologies.train.train;

import com.droptechnologies.train.common.error.ApiException;
import com.droptechnologies.train.dto.ScheduleStop;
import com.droptechnologies.train.dto.TrainSchedule;
import com.droptechnologies.train.station.StationRepository;
import com.droptechnologies.train.train.dto.TrainSearchResult;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class TrainService {

    private final TrainRepository trains;
    private final StationRepository stations;

    public TrainService(TrainRepository trains, StationRepository stations) {
        this.trains = trains;
        this.stations = stations;
    }

    public List<TrainSearchResult> search(String from, String to) {
        String f = from.trim().toUpperCase(Locale.ROOT);
        String t = to.trim().toUpperCase(Locale.ROOT);

        if (f.isEmpty() || t.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "STATION_REQUIRED",
                    "Source and destination are required");
        }
        if (f.equals(t)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SAME_STATION",
                    "Source and destination must be different");
        }
        if (!stations.exists(f)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "STATION_NOT_FOUND", "Unknown station: " + f);
        }
        if (!stations.exists(t)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "STATION_NOT_FOUND", "Unknown station: " + t);
        }
        return trains.search(f, t, 100);
    }

    public TrainSchedule schedule(String trainNo) {
        String no = trainNo.trim();
        List<ScheduleStop> stops = trains.findStops(no);
        if (stops.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "TRAIN_NOT_FOUND", "No train with number " + no);
        }
        String name = trains.findTrainName(no).orElse("Train " + no);
        return new TrainSchedule(no, name, stops);
    }
}