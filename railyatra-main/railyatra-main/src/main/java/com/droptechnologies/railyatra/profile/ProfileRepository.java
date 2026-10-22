package com.droptechnologies.railyatra.profile;

import com.droptechnologies.railyatra.profile.dto.ProfileResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public class ProfileRepository {

    private final JdbcTemplate jdbc;

    public ProfileRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<ProfileResponse> find(long userId) {
        return jdbc.query("""
            SELECT u.email, u.phone, u.email_verified, p.full_name, p.date_of_birth, p.gender,
                   p.preferred_class, p.preferred_berth, p.home_station_code, p.language,
                   p.notify_email, p.notify_sms
            FROM users u
            JOIN user_profiles p ON p.user_id = u.id
            WHERE u.id = ?
            """,
            (rs, i) -> new ProfileResponse(
                    rs.getString("email"), rs.getString("phone"), rs.getBoolean("email_verified"),
                    rs.getString("full_name"), rs.getObject("date_of_birth", LocalDate.class),
                    rs.getString("gender"), rs.getString("preferred_class"), rs.getString("preferred_berth"),
                    rs.getString("home_station_code"), rs.getString("language"),
                    rs.getBoolean("notify_email"), rs.getBoolean("notify_sms")),
            userId).stream().findFirst();
    }

    public int update(long userId, String fullName, LocalDate dob, String gender, String preferredClass,
                      String preferredBerth, String homeStation, String language,
                      boolean notifyEmail, boolean notifySms) {
        return jdbc.update("""
            UPDATE user_profiles
            SET full_name = ?, date_of_birth = ?, gender = ?, preferred_class = ?, preferred_berth = ?,
                home_station_code = ?, language = ?, notify_email = ?, notify_sms = ?
            WHERE user_id = ?
            """, fullName, dob, gender, preferredClass, preferredBerth, homeStation,
                language, notifyEmail, notifySms, userId);
    }
}