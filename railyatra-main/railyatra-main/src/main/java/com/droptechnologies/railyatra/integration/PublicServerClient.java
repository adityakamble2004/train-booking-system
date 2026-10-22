
package com.droptechnologies.railyatra.integration;

import com.droptechnologies.railyatra.common.error.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PublicServerClient {

    private final RestClient client;

    // Cache configuration: keep schedules for 10 minutes
    private static final Duration CACHE_TTL = Duration.ofMinutes(10);

    // Stores train number -> cached schedule and expiry time
    private record Cached(ScheduleDto dto, Instant expires) {}

    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public PublicServerClient(
            @Value("${app.public-server.url:http://localhost:8080/api/v1}")
            String baseUrl) {

        HttpClient http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();

        JdkClientHttpRequestFactory factory =
                new JdkClientHttpRequestFactory(http);

        factory.setReadTimeout(Duration.ofSeconds(5));

        this.client = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }

    // Existing method: fetch schedule from public server
    public ScheduleDto schedule(String trainNo) {
        try {
            ScheduleDto dto = client.get()
                    .uri("/trains/{no}/schedule", trainNo)
                    .retrieve()
                    .body(ScheduleDto.class);

            if (dto == null || dto.stops() == null || dto.stops().isEmpty()) {
                throw notFound(trainNo);
            }

            return dto;

        } catch (HttpClientErrorException.NotFound e) {
            throw notFound(trainNo);

        } catch (RestClientException e) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "UPSTREAM_UNAVAILABLE",
                    "Train data service is not reachable"
            );
        }
    }

    // New method: return cached schedule when available
    public ScheduleDto scheduleCached(String trainNo) {

        Cached c = cache.get(trainNo);

        // Return cached schedule if it has not expired
        if (c != null && c.expires().isAfter(Instant.now())) {
            return c.dto();
        }

        // Cache miss or expired: fetch fresh schedule
        ScheduleDto dto = schedule(trainNo);

        // Save schedule with a new expiry time
        cache.put(
                trainNo,
                new Cached(dto, Instant.now().plus(CACHE_TTL))
        );

        return dto;
    }

    private static ApiException notFound(String trainNo) {
        return new ApiException(
                HttpStatus.NOT_FOUND,
                "TRAIN_NOT_FOUND",
                "No train with number " + trainNo
        );
    }
}
