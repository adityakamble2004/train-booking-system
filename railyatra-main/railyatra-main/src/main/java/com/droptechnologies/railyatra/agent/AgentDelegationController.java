package com.droptechnologies.railyatra.agent;

import com.droptechnologies.railyatra.agent.dto.ActionResponse;
import com.droptechnologies.railyatra.agent.dto.CreateDelegationRequest;
import com.droptechnologies.railyatra.agent.dto.DelegationResponse;
import com.droptechnologies.railyatra.agent.dto.DelegationTokenResponse;
import com.droptechnologies.railyatra.common.dto.PageResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/agent/delegations")
public class AgentDelegationController {

    private final DelegationService service;

    public AgentDelegationController(DelegationService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<DelegationResponse> create(@AuthenticationPrincipal Jwt jwt,
                                                     @Valid @RequestBody CreateDelegationRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(owner(jwt), body));
    }

    @GetMapping
    public List<DelegationResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return service.list(owner(jwt));
    }

    @PostMapping("/{id}/revoke")
    public DelegationResponse revoke(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return service.revoke(owner(jwt), id);
    }

    @PostMapping("/{id}/token")
    public DelegationTokenResponse token(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        return service.mintToken(owner(jwt), id);
    }

    @GetMapping("/{id}/actions")
    public PageResponse<ActionResponse> actions(@AuthenticationPrincipal Jwt jwt, @PathVariable long id,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        return service.actions(owner(jwt), id, page, size);
    }

    private static long owner(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}