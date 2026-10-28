package com.droptechnologies.railyatra.agent;

import com.droptechnologies.railyatra.agent.DelegationRepository.Row;
import com.droptechnologies.railyatra.booking.dto.CreateBookingRequest.PassengerInput;
import com.droptechnologies.railyatra.common.error.ApiException;
import com.droptechnologies.railyatra.passenger.PassengerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DelegationPolicy {

    private final DelegationRepository delegations;
    private final PassengerRepository passengers;

    public DelegationPolicy(DelegationRepository delegations, PassengerRepository passengers) {
        this.delegations = delegations;
        this.passengers = passengers;
    }

    /** Throws 403 if this booking is outside what the owner allowed. */
    public void check(long delegationId, long ownerId, String classCode,
                      List<PassengerInput> people, int totalFarePaise) {
        Row d = delegations.findById(delegationId).orElseThrow(
                () -> new ApiException(HttpStatus.FORBIDDEN, "DELEGATION_INACTIVE", "Assistant access not found"));
        if (d.ownerUserId() != ownerId || !d.usable()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "DELEGATION_INACTIVE",
                    "This assistant access has been revoked or has expired");
        }
        if (!d.allowedClasses().isEmpty() && !d.allowedClasses().contains(classCode)) {
            throw limit("The assistant may only book these classes: " + String.join(", ", d.allowedClasses()));
        }
        if (people.size() > d.maxPassengers()) {
            throw limit("The assistant may book at most " + d.maxPassengers() + " passenger(s) at a time");
        }
        if (totalFarePaise > d.maxFarePerBookingPaise()) {
            throw limit("This booking costs more than the per-booking limit you set for the assistant");
        }
        if (delegations.spentLast24h(delegationId) + totalFarePaise > d.maxSpend24hPaise()) {
            throw limit("This would go over the assistant's 24-hour spending limit");
        }
        if (d.savedPassengersOnly()) {
            List<PassengerRepository.Row> saved = passengers.list(ownerId);
            for (PassengerInput p : people) {
                boolean known = saved.stream().anyMatch(s ->
                        s.name().equalsIgnoreCase(p.name().trim())
                                && s.dateOfBirth().equals(p.dateOfBirth())
                                && s.gender().equals(p.gender()));
                if (!known) {
                    throw limit("The assistant may only book for passengers saved in your profile: " + p.name());
                }
            }
        }
    }

    private static ApiException limit(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "DELEGATION_LIMIT", message);
    }
}