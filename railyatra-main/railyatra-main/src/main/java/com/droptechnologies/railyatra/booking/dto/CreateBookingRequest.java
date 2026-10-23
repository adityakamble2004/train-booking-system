package com.droptechnologies.railyatra.booking.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record CreateBookingRequest(
        @NotBlank @Pattern(regexp = "^[0-9A-Za-z]{3,10}$", message = "Enter a valid train number") String trainNo,
        @NotNull LocalDate journeyDate,
        @NotBlank @Pattern(regexp = "^[A-Za-z0-9]{1,15}$", message = "Enter a station code") String fromStation,
        @NotBlank @Pattern(regexp = "^[A-Za-z0-9]{1,15}$", message = "Enter a station code") String toStation,
        @NotBlank @Pattern(regexp = "^(SL|3A|2A|1A|CC|EC|2S|3E)$", message = "Unknown travel class") String classCode,
        @NotBlank @Email @Size(max = 254) String contactEmail,
        @Pattern(regexp = "^[6-9][0-9]{9}$", message = "Enter a 10-digit mobile number") String contactPhone,
        @NotEmpty @Size(max = 6, message = "You can book at most 6 passengers at a time") @Valid
        List<PassengerInput> passengers) {

    public record PassengerInput(
            @NotBlank @Size(max = 100) String name,
            @NotNull @Past LocalDate dateOfBirth,
            @NotBlank @Pattern(regexp = "^[MFO]$", message = "Use M, F or O") String gender,
            @Pattern(regexp = "^(LOWER|MIDDLE|UPPER|SIDE_LOWER|SIDE_UPPER|NO_PREFERENCE)$",
                     message = "Unknown berth preference") String berthPreference) {}
}