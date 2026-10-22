package com.droptechnologies.railyatra.auth.dto;

public record AuthResponse(String accessToken, String tokenType, long expiresIn, UserSummary user) {}