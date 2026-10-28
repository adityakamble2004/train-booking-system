package com.droptechnologies.railyatra.agent.dto;

import java.util.List;

public record DelegationTokenResponse(String accessToken, String tokenType, long expiresIn,
                                      long delegationId, List<String> scopes) {}