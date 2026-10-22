
package com.Droptechnologyes.train.Booking;

public record TrainSearchResult(
        String trainNo,
        String trainName,
        String fromStation,
        String departureTime,
        String toStation,
        String arrivalTime
) {
}
