package com.droptechnologies.railyatra.agent;

import com.droptechnologies.railyatra.agent.DelegationRepository.Row;
import com.droptechnologies.railyatra.common.web.ErrorWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/** Deny-by-default gate for requests that carry an agent (delegated) token. Created in SecurityConfig, not a bean. */
public class AgentAccessFilter extends OncePerRequestFilter {

    private record Rule(String method, String pattern, String scope) {}

    private static final List<Rule> ALLOWED = List.of(
            new Rule("GET",  "/api/v1/availability",          "search"),
            new Rule("GET",  "/api/v1/journeys/open-dates",   "search"),
            new Rule("GET",  "/api/v1/users/me",              "read_profile"),
            new Rule("GET",  "/api/v1/users/me/passengers",   "read_passengers"),
            new Rule("POST", "/api/v1/bookings",              "book"),
            new Rule("GET",  "/api/v1/bookings",              "read_bookings"),
            new Rule("GET",  "/api/v1/bookings/*",            "read_bookings"),
            new Rule("GET",  "/api/v1/bookings/*/ticket",     "read_bookings"),
            new Rule("GET",  "/api/v1/pnr/*",                 "read_bookings"),
            new Rule("POST", "/api/v1/bookings/*/cancel",     "cancel"));

    private static final AntPathMatcher MATCHER = new AntPathMatcher();
    private static final Logger log = LoggerFactory.getLogger(AgentAccessFilter.class);

    private final DelegationRepository delegations;

    public AgentAccessFilter(DelegationRepository delegations) {
        this.delegations = delegations;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwtAuth)
                || jwtAuth.getToken().getClaimAsString("delegation_id") == null) {
            chain.doFilter(req, res);                       // a normal user: not our business
            return;
        }

        Jwt jwt = jwtAuth.getToken();
        long delegationId;
        try {
            delegationId = Long.parseLong(jwt.getClaimAsString("delegation_id"));
        } catch (NumberFormatException e) {
            ErrorWriter.write(req, res, 401, "DELEGATION_INACTIVE", "Invalid assistant token");
            return;
        }
        String method = req.getMethod();
        String path = req.getRequestURI();

        Optional<Row> found = delegations.findById(delegationId);       // live check, so revoke works instantly
        if (found.isEmpty() || found.get().ownerUserId() != Long.parseLong(jwt.getSubject())
                || !found.get().usable()) {
            deny(req, res, delegationId, 401, "DELEGATION_INACTIVE",
                    "This assistant access has been revoked or has expired");
            return;
        }

        Rule rule = ALLOWED.stream()
                .filter(r -> r.method().equals(method) && MATCHER.match(r.pattern(), path))
                .findFirst().orElse(null);
        if (rule == null) {
            deny(req, res, delegationId, 403, "AGENT_FORBIDDEN", "The assistant is not allowed to do this");
            return;
        }
        List<String> tokenScopes = Arrays.asList(
                String.valueOf(jwt.getClaimAsString("scope")).split(" "));
        if (!found.get().scopes().contains(rule.scope()) || !tokenScopes.contains(rule.scope())) {
            deny(req, res, delegationId, 403, "AGENT_SCOPE_MISSING",
                    "The assistant does not have permission: " + rule.scope());
            return;
        }

        try {
            chain.doFilter(req, res);
        } finally {
            audit(delegationId, method, path, req.getQueryString(), res.getStatus());
        }
    }

    private void deny(HttpServletRequest req, HttpServletResponse res, long delegationId,
                      int status, String code, String message) throws IOException {
        audit(delegationId, req.getMethod(), req.getRequestURI(), req.getQueryString(), status);
        ErrorWriter.write(req, res, status, code, message);
    }

    private void audit(long delegationId, String method, String path, String query, int status) {
        try {
            delegations.insertAction(delegationId, "API", method, path, query, status, null);
        } catch (Exception e) {
            log.error("Could not write agent audit entry", e);   // never break the request because of logging
        }
    }
}