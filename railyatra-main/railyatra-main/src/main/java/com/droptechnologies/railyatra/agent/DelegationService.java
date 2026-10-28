package com.droptechnologies.railyatra.agent;

import com.droptechnologies.railyatra.agent.DelegationRepository.Row;
import com.droptechnologies.railyatra.agent.dto.ActionResponse;
import com.droptechnologies.railyatra.agent.dto.CreateDelegationRequest;
import com.droptechnologies.railyatra.agent.dto.DelegationResponse;
import com.droptechnologies.railyatra.agent.dto.DelegationTokenResponse;
import com.droptechnologies.railyatra.auth.TokenService;
import com.droptechnologies.railyatra.common.dto.PageResponse;
import com.droptechnologies.railyatra.common.error.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

@Service
public class DelegationService {

    private static final int MAX_ACTIVE = 5;
    private static final Duration TOKEN_TTL = Duration.ofMinutes(15);

    private final DelegationRepository repo;
    private final TokenService tokens;

    public DelegationService(DelegationRepository repo, TokenService tokens) {
        this.repo = repo;
        this.tokens = tokens;
    }

    public DelegationResponse create(long ownerId, CreateDelegationRequest r) {
        if (r.maxSpend24hPaise() < r.maxFarePerBookingPaise()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED",
                    "The 24-hour spending limit cannot be lower than the per-booking limit");
        }
        if (repo.countActive(ownerId) >= MAX_ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "DELEGATION_LIMIT_REACHED",
                    "You can have at most " + MAX_ACTIVE + " active assistants. Revoke one first.");
        }
        List<String> scopes = r.scopes().stream().distinct().toList();
        List<String> classes = r.allowedClasses() == null ? List.of() : r.allowedClasses().stream().distinct().toList();
        int maxPassengers = r.maxPassengers() == null ? 4 : r.maxPassengers();
        boolean savedOnly = r.savedPassengersOnly() == null || r.savedPassengersOnly();

        long id = repo.insert(ownerId, r.name().trim(), String.join(" ", scopes), r.maxFarePerBookingPaise(),
                r.maxSpend24hPaise(), maxPassengers, classes.isEmpty() ? null : String.join(",", classes),
                savedOnly, r.validDays());
        return toResponse(repo.findOwned(id, ownerId).orElseThrow());
    }

    public List<DelegationResponse> list(long ownerId) {
        return repo.listByOwner(ownerId).stream().map(DelegationService::toResponse).toList();
    }

    public DelegationResponse revoke(long ownerId, long id) {
        repo.findOwned(id, ownerId).orElseThrow(DelegationService::notFound);
        repo.revoke(id, ownerId);                                   // repeating it is harmless
        return toResponse(repo.findOwned(id, ownerId).orElseThrow());
    }

    public DelegationTokenResponse mintToken(long ownerId, long id) {
        Row d = repo.findOwned(id, ownerId).orElseThrow(DelegationService::notFound);
        if (!d.usable()) {
            throw new ApiException(HttpStatus.CONFLICT, "DELEGATION_INACTIVE",
                    "This assistant is revoked or expired");
        }
        String token = tokens.delegatedToken(ownerId, d.id(), d.scopes(), TOKEN_TTL);
        return new DelegationTokenResponse(token, "Bearer", TOKEN_TTL.toSeconds(), d.id(), d.scopes());
    }

    public PageResponse<ActionResponse> actions(long ownerId, long id, int page, int size) {
        repo.findOwned(id, ownerId).orElseThrow(DelegationService::notFound);
        int p = Math.max(page, 0);
        int s = Math.min(Math.max(size, 1), 100);
        return new PageResponse<>(repo.listActions(id, s, p * s), p, s, repo.countActions(id));
    }

    private static DelegationResponse toResponse(Row d) {
        return new DelegationResponse(d.id(), d.name(), d.status(), d.usable(), d.scopes(),
                d.maxFarePerBookingPaise(), d.maxSpend24hPaise(), d.maxPassengers(), d.allowedClasses(),
                d.savedPassengersOnly(), d.expiresAt(), d.createdAt(), d.revokedAt());
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "DELEGATION_NOT_FOUND", "Assistant not found");
    }
}