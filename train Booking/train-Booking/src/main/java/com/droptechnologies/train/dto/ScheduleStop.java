package com.droptechnologies.train.dto;

public record ScheduleStop(int order, String stationCode, String stationName,
        String arrival, String departure) {}