package com.droptechnologies.train.train.dto;

import com.droptechnologies.train.dto.FromStop;
import com.droptechnologies.train.dto.ToStop;

public record TrainSearchResult(String trainNo, String trainName, FromStop from, ToStop to) {}