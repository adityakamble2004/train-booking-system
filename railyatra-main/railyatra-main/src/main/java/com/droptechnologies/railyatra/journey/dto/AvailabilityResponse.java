package com.droptechnologies.railyatra.journey.dto;

import java.time.LocalDate;
import java.util.List;

public record AvailabilityResponse(String trainNo, String trainName, LocalDate journeyDate,
                                   StopInfo from, StopInfo to, List<ClassAvailability> classes) {

    public record StopInfo(String code, String name, String time) {}

    public record ClassAvailability(String classCode, int totalSeats, int availableSeats,
                                    String status, int farePaise) {}
}