package com.droptechnologies.train.dto;

import java.util.List;

public record TrainSchedule(String trainNo, String trainName, List<ScheduleStop> stops) {}
