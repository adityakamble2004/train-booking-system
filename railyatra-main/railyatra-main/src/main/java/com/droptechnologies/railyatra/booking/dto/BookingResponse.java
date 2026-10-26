package com.droptechnologies.railyatra.booking.dto;

import java.time.LocalDate;
import java.util.List;

public record BookingResponse(
        String pnr, String status, String trainNo, String trainName, LocalDate journeyDate, String classCode,
        Stop from, Stop to, int totalFarePaise, Integer refundPaise, long holdSecondsLeft, String contactEmail,
        List<PassengerSeat> passengers) {

    public record Stop(String code, String name, String time) {}

    public record PassengerSeat(String name, int age, String gender, String status,
                                String coach, Integer seatNo, String berth) {}
}