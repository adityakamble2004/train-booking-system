package com.droptechnologies.railyatra.agent.dto;

import java.time.Instant;

public record ActionResponse(long id, String actor, String method, String path, String query,
                             Integer statusCode, String summary, Instant createdAt) {}