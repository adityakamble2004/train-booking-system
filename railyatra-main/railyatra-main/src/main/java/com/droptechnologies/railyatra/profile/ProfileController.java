package com.droptechnologies.railyatra.profile;

import com.droptechnologies.railyatra.profile.dto.ChangePasswordRequest;
import com.droptechnologies.railyatra.profile.dto.ProfileResponse;
import com.droptechnologies.railyatra.profile.dto.UpdateProfileRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/me")
public class ProfileController {

    private final ProfileService service;

    public ProfileController(ProfileService service) {
        this.service = service;
    }

    @GetMapping("/profile")
    public ProfileResponse get(@AuthenticationPrincipal Jwt jwt) {
        return service.get(Long.parseLong(jwt.getSubject()));
    }

    @PutMapping("/profile")
    public ProfileResponse update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateProfileRequest body) {
        return service.update(Long.parseLong(jwt.getSubject()), body);
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal Jwt jwt,
                                               @Valid @RequestBody ChangePasswordRequest body) {
        service.changePassword(Long.parseLong(jwt.getSubject()), body);
        return ResponseEntity.noContent().build();
    }
}