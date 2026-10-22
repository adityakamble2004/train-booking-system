package com.droptechnologies.train.train;

import org.springframework.web.bind.annotation.*;

import com.droptechnologies.train.dto.TrainSchedule;
import com.droptechnologies.train.train.dto.TrainSearchResult;

import java.util.List;

@RestController
@RequestMapping("/api/v1/trains")
public class TrainController {

    private final TrainService service;

    public TrainController(TrainService service) {
        this.service = service;
    }

    @GetMapping("/search")
    public List<TrainSearchResult> search(@RequestParam String from, @RequestParam String to) {
        return service.search(from, to);
    }

    @GetMapping("/{trainNo}/schedule")
    public TrainSchedule schedule(@PathVariable String trainNo) {
        return service.schedule(trainNo);
    }
}