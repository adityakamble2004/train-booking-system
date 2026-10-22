package com.droptechnologies.railyatra.passenger;

import com.droptechnologies.railyatra.passenger.dto.PassengerRequest;
import com.droptechnologies.railyatra.passenger.dto.PassengerResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users/me/passengers")
public class PassengerController {

    private final PassengerService service;

    public PassengerController(PassengerService service) {
        this.service = service;
    }

    @GetMapping
    public List<PassengerResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return service.list(Long.parseLong(jwt.getSubject()));
    }

    @PostMapping
    public ResponseEntity<PassengerResponse> create(@AuthenticationPrincipal Jwt jwt,
                                                    @Valid @RequestBody PassengerRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(Long.parseLong(jwt.getSubject()), body));
    }

    @PutMapping("/{id}")
    public PassengerResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable long id,
                                    @Valid @RequestBody PassengerRequest body) {
        return service.update(Long.parseLong(jwt.getSubject()), id, body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        service.delete(Long.parseLong(jwt.getSubject()), id);
        return ResponseEntity.noContent().build();
    }
}