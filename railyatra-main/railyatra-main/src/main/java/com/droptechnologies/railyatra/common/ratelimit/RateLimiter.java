package com.droptechnologies.railyatra.common.ratelimit;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Sliding-window limiter, in memory. Fine for one server; use Redis if you ever run several. */
@Component
public class RateLimiter {

    private static final long KEEP_NANOS = Duration.ofMinutes(10).toNanos();

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    public boolean allow(String key, int max, Duration window) {
        long now = System.nanoTime();
        long cutoff = now - window.toNanos();
        Deque<Long> times = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst() < cutoff) {
                times.pollFirst();
            }
            if (times.size() >= max) {
                return false;
            }
            times.addLast(now);
            return true;
        }
    }

    @Scheduled(fixedDelay = 300_000)
    public void cleanup() {
        long cutoff = System.nanoTime() - KEEP_NANOS;
        hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                Long last = e.getValue().peekLast();
                return last == null || last < cutoff;
            }
        });
    }
}