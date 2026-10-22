package com.droptechnologies.railyatra.journey.dto;

import java.time.LocalDate;
import java.util.List;

public record JourneySummary(long id, String trainNo, String trainName, LocalDate journeyDate,
                             String status, List<ClassSeats> classes) {

    public record ClassSeats(String classCode, int totalSeats) {}
}