package com.droptechnologies.railyatra.auth.dto;

public record UserSummary(long id, String email, String fullName, String role) {}