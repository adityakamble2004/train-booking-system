package com.droptechnologies.railyatra.profile.dto;

import java.time.LocalDate;

public record ProfileResponse(
        String email, String phone, boolean emailVerified,
        String fullName, LocalDate dateOfBirth, String gender,
        String preferredClass, String preferredBerth, String homeStationCode,
        String language, boolean notifyEmail, boolean notifySms) {}