package com.droptechnologies.railyatra.booking;

public record BookingCancelledEvent(String pnr, long bookingId, int refundPaise) {}