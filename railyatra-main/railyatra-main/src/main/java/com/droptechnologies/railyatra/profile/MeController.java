package com.droptechnologies.railyatra.profile;

import com.droptechnologies.railyatra.auth.UserRepository;
import com.droptechnologies.railyatra.auth.dto.UserSummary;
import com.droptechnologies.railyatra.common.error.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class MeController {

    private final UserRepository users;

    public MeController(UserRepository users) {
        this.users = users;
    }

    @GetMapping("/me")
    public UserSummary me(@AuthenticationPrincipal Jwt jwt) {
        long id = Long.parseLong(jwt.getSubject());
        return users.findById(id)
                .map(u -> new UserSummary(u.id(), u.email(), u.fullName(), u.role()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Log in to continue"));
    }
}