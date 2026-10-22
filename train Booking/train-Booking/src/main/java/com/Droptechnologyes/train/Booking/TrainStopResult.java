
package com.Droptechnologyes.train.Booking;

public record TrainStopResult(
        String trainNo,
        String trainName,
        Integer routeOrder,
        String stationName,
        String arrivalTime,
        String departureTime
) {
}
