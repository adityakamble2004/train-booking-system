package com.droptechnologies.railyatra.passenger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record PassengerRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull @Past LocalDate dateOfBirth,
        @NotBlank @Pattern(regexp = "^[MFO]$", message = "Use M, F or O") String gender,
        @Pattern(regexp = "^(LOWER|MIDDLE|UPPER|SIDE_LOWER|SIDE_UPPER|NO_PREFERENCE)$",
                 message = "Unknown berth preference") String berthPreference,
        @Pattern(regexp = "^(AADHAAR|PASSPORT|DRIVING_LICENCE|VOTER_ID|PAN)$", message = "Unknown ID type") String idType,
        @Pattern(regexp = "^[0-9]{4}$", message = "Enter the last 4 digits only") String idLast4) {}