package com.droptechnologies.railyatra.agent.dto;

import java.time.Instant;
import java.util.List;

public record DelegationResponse(long id, String name, String status, boolean usable, List<String> scopes,
                                 int maxFarePerBookingPaise, int maxSpend24hPaise, int maxPassengers,
                                 List<String> allowedClasses, boolean savedPassengersOnly,
                                 Instant expiresAt, Instant createdAt, Instant revokedAt) {}