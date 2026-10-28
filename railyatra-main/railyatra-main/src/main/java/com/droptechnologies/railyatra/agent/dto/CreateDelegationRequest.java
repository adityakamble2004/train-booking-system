package com.droptechnologies.railyatra.agent.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateDelegationRequest(
        @NotBlank @Size(max = 60) String name,
        @NotEmpty List<@Pattern(regexp = "^(search|read_profile|read_passengers|book|read_bookings|cancel)$",
                                message = "Unknown scope") String> scopes,
        @NotNull @Min(100) @Max(10_000_000) Integer maxFarePerBookingPaise,
        @NotNull @Min(100) @Max(50_000_000) Integer maxSpend24hPaise,
        @Min(1) @Max(6) Integer maxPassengers,
        List<@Pattern(regexp = "^(SL|3A|2A|1A|CC|EC|2S|3E)$", message = "Unknown travel class") String> allowedClasses,
        Boolean savedPassengersOnly,
        @NotNull @Min(1) @Max(90) Integer validDays) {}