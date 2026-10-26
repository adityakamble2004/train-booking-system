package com.droptechnologies.railyatra.booking.dto;

import java.time.LocalDate;

public record BookingSummary(String pnr, String status, String trainNo, String trainName, LocalDate journeyDate,
                             String classCode, String fromCode, String fromName, String toCode, String toName,
                             int totalFarePaise, int passengerCount) {}