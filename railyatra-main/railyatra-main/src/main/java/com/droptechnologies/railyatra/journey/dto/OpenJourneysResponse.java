package com.droptechnologies.railyatra.journey.dto;

import java.time.LocalDate;
import java.util.List;

public record OpenJourneysResponse(String trainNo, String trainName, int journeysCreated,
                                   List<LocalDate> skippedDates, int seatsCreated) {}