package com.droptechnologies.railyatra.profile.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateProfileRequest(
        @NotBlank @Size(max = 100) String fullName,
        @Past LocalDate dateOfBirth,
        @Pattern(regexp = "^[MFO]$", message = "Use M, F or O") String gender,
        @Pattern(regexp = "^(SL|3A|2A|1A|CC|EC|2S|3E)$", message = "Unknown travel class") String preferredClass,
        @Pattern(regexp = "^(LOWER|MIDDLE|UPPER|SIDE_LOWER|SIDE_UPPER|NO_PREFERENCE)$",
                 message = "Unknown berth preference") String preferredBerth,
        @Pattern(regexp = "^[A-Za-z0-9]{1,15}$", message = "Enter a station code") String homeStationCode,
        @Pattern(regexp = "^(en|hi|mr)$", message = "Use en, hi or mr") String language,
        @NotNull Boolean notifyEmail,
        @NotNull Boolean notifySms) {}