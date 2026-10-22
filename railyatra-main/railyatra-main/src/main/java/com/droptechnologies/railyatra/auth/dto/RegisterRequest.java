package com.droptechnologies.railyatra.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 8, max = 72)
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "Use at least one letter and one number")
        String password,
        @NotBlank @Size(max = 100) String fullName,
        @Pattern(regexp = "^[6-9][0-9]{9}$", message = "Enter a 10-digit mobile number") String phone) {}