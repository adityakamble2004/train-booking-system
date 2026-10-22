package com.droptechnologies.railyatra.passenger.dto;

import java.time.LocalDate;

public record PassengerResponse(long id, String name, LocalDate dateOfBirth, int age, String gender,
                                String berthPreference, String idType, String idLast4) {}