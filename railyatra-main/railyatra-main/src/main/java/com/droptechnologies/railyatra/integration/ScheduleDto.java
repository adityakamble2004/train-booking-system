package com.droptechnologies.railyatra.integration;

import java.util.List;

public record ScheduleDto(String trainNo, String trainName, List<StopDto> stops) {

    public record StopDto(int order, String stationCode, String stationName,
                          String arrival, String departure) {}
}