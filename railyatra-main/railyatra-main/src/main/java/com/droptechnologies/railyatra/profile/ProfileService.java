package com.droptechnologies.railyatra.profile;

import com.droptechnologies.railyatra.auth.RefreshTokenRepository;
import com.droptechnologies.railyatra.auth.UserRepository;
import com.droptechnologies.railyatra.common.error.ApiException;
import com.droptechnologies.railyatra.profile.dto.ChangePasswordRequest;
import com.droptechnologies.railyatra.profile.dto.ProfileResponse;
import com.droptechnologies.railyatra.profile.dto.UpdateProfileRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class ProfileService {

    private static final int MAX_FAILS = 5;
    private static final int LOCK_MINUTES = 15;

    private final ProfileRepository profiles;
    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder encoder;

    public ProfileService(ProfileRepository profiles, UserRepository users,
                          RefreshTokenRepository refreshTokens, PasswordEncoder encoder) {
        this.profiles = profiles;
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.encoder = encoder;
    }

    public ProfileResponse get(long userId) {
        return profiles.find(userId).orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "PROFILE_NOT_FOUND", "Profile not found"));
    }

    public ProfileResponse update(long userId, UpdateProfileRequest r) {
        int rows = profiles.update(userId, r.fullName().trim(), r.dateOfBirth(), upper(r.gender()),
                upper(r.preferredClass()), r.preferredBerth(), upper(r.homeStationCode()),
                r.language() == null ? "en" : r.language(), r.notifyEmail(), r.notifySms());
        if (rows == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "PROFILE_NOT_FOUND", "Profile not found");
        }
        return get(userId);
    }

    /** noRollbackFor: a wrong current password must still count towards the lockout. */
    @Transactional(noRollbackFor = ApiException.class)
    public void changePassword(long userId, ChangePasswordRequest r) {
        if (r.newPassword().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Password is too long");
        }
        var user = users.findById(userId).orElseThrow(
                () -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Log in to continue"));

        boolean currentOk = r.currentPassword().getBytes(StandardCharsets.UTF_8).length <= 72
                && encoder.matches(r.currentPassword(), user.passwordHash());
        if (!currentOk) {
            users.recordFailedLogin(userId, MAX_FAILS, LOCK_MINUTES);
            throw new ApiException(HttpStatus.BAD_REQUEST, "WRONG_CURRENT_PASSWORD", "Current password is incorrect");
        }
        if (encoder.matches(r.newPassword(), user.passwordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SAME_PASSWORD",
                    "New password must be different from the current one");
        }
        users.updatePasswordHash(userId, encoder.encode(r.newPassword()));
        refreshTokens.revokeAllForUser(userId);
    }

    private static String upper(String s) {
        return s == null ? null : s.toUpperCase(Locale.ROOT);
    }
}