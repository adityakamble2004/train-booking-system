CREATE TABLE stations (
    code        VARCHAR(15)  NOT NULL,
    name        VARCHAR(150) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (code),
    KEY idx_stations_name (name)
);

INSERT INTO stations (code, name)
SELECT TRIM(station_code), MIN(TRIM(station_name))
FROM train_route_stops
WHERE station_code IS NOT NULL AND TRIM(station_code) <> ''
GROUP BY TRIM(station_code);

CREATE INDEX idx_stops_train_order ON train_route_stops (train_no, route_order);