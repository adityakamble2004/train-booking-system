package com.droptechnologies.railyatra.journey.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record OpenJourneysRequest(
        @NotBlank @Pattern(regexp = "^[0-9A-Za-z]{3,10}$", message = "Enter a valid train number") String trainNo,
        @NotNull LocalDate fromDate,
        @NotNull LocalDate toDate,
        @NotEmpty @Size(max = 8) @Valid List<ClassSpec> classes) {

    public record ClassSpec(
            @NotBlank @Pattern(regexp = "^(SL|3A|2A|1A|CC|EC|2S|3E)$", message = "Unknown travel class") String classCode,
            @Min(1) @Max(30) int coaches) {}
}