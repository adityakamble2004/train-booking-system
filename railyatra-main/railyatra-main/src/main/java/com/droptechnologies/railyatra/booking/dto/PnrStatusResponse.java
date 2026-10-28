package com.droptechnologies.railyatra.booking.dto;

import java.time.LocalDate;
import java.util.List;

public record PnrStatusResponse(String pnr, String status, String trainNo, String trainName, LocalDate journeyDate,
                                String classCode, BookingResponse.Stop from, BookingResponse.Stop to,
                                List<Passenger> passengers) {

    public record Passenger(String name, String status, String coach, Integer seatNo, String berth) {}
}