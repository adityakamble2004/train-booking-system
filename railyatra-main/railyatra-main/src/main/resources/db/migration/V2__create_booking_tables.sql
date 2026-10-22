CREATE TABLE fare_rules (
    class_code      VARCHAR(3) NOT NULL,
    base_paise      INT        NOT NULL,
    per_stop_paise  INT        NOT NULL,
    PRIMARY KEY (class_code)
);

-- Placeholder fares, edit later. fare = base + per_stop * stops travelled
INSERT INTO fare_rules (class_code, base_paise, per_stop_paise) VALUES
    ('2S',  1000,   800),
    ('SL',  2000,  1500),
    ('CC',  3000,  3000),
    ('3E',  4000,  3500),
    ('3A',  5000,  4000),
    ('EC',  6000,  6000),
    ('2A',  7000,  6000),
    ('1A', 12000, 10000);

CREATE TABLE journeys (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    train_no      VARCHAR(10)  NOT NULL,
    train_name    VARCHAR(255) NOT NULL,
    journey_date  DATE         NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_journey (train_no, journey_date),
    CONSTRAINT chk_journey_status CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED'))
);

CREATE TABLE journey_classes (
    id           BIGINT      NOT NULL AUTO_INCREMENT,
    journey_id   BIGINT      NOT NULL,
    class_code   VARCHAR(3)  NOT NULL,
    total_seats  INT         NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_journey_class (journey_id, class_code),
    CONSTRAINT fk_jc_journey FOREIGN KEY (journey_id) REFERENCES journeys (id) ON DELETE CASCADE,
    CONSTRAINT fk_jc_fare    FOREIGN KEY (class_code) REFERENCES fare_rules (class_code)
);

CREATE TABLE seats (
    id                BIGINT      NOT NULL AUTO_INCREMENT,
    journey_class_id  BIGINT      NOT NULL,
    coach_no          VARCHAR(4)  NOT NULL,
    seat_no           INT         NOT NULL,
    berth_type        VARCHAR(12) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_seat (journey_class_id, coach_no, seat_no),
    CONSTRAINT fk_seat_jc FOREIGN KEY (journey_class_id) REFERENCES journey_classes (id) ON DELETE CASCADE,
    CONSTRAINT chk_seat_berth CHECK (berth_type IS NULL OR berth_type IN
        ('LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER', 'SIDE_UPPER'))
);

CREATE TABLE bookings (
    id                 BIGINT        NOT NULL AUTO_INCREMENT,
    pnr                CHAR(10)      NOT NULL,
    user_id            BIGINT        NOT NULL,
    journey_id         BIGINT        NOT NULL,
    class_code         VARCHAR(3)    NOT NULL,
    from_station_code  VARCHAR(15)   NOT NULL,
    from_station_name  VARCHAR(150)  NOT NULL,
    from_seq           INT           NOT NULL,
    departure_time     VARCHAR(5)    NULL,
    to_station_code    VARCHAR(15)   NOT NULL,
    to_station_name    VARCHAR(150)  NOT NULL,
    to_seq             INT           NOT NULL,
    arrival_time       VARCHAR(5)    NULL,
    status             VARCHAR(20)   NOT NULL,
    total_fare_paise   INT           NOT NULL,
    contact_email      VARCHAR(254)  NOT NULL,
    contact_phone      VARCHAR(15)   NULL,
    hold_expires_at    TIMESTAMP     NULL,
    idempotency_key    VARCHAR(64)   NULL,
    created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    confirmed_at       TIMESTAMP     NULL,
    cancelled_at       TIMESTAMP     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_bookings_pnr (pnr),
    UNIQUE KEY uk_bookings_idem (user_id, idempotency_key),
    KEY idx_bookings_user (user_id, created_at),
    KEY idx_bookings_hold (status, hold_expires_at),
    CONSTRAINT fk_booking_user    FOREIGN KEY (user_id)    REFERENCES users (id),
    CONSTRAINT fk_booking_journey FOREIGN KEY (journey_id) REFERENCES journeys (id),
    CONSTRAINT fk_booking_fare    FOREIGN KEY (class_code) REFERENCES fare_rules (class_code),
    CONSTRAINT chk_booking_status CHECK (status IN
        ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'FAILED')),
    CONSTRAINT chk_booking_seq CHECK (from_seq < to_seq)
);

CREATE TABLE booking_passengers (
    id                BIGINT        NOT NULL AUTO_INCREMENT,
    booking_id        BIGINT        NOT NULL,
    name              VARCHAR(100)  NOT NULL,
    date_of_birth     DATE          NOT NULL,
    age_at_journey    INT           NOT NULL,
    gender            CHAR(1)       NOT NULL,
    berth_preference  VARCHAR(20)   NULL,
    status            VARCHAR(10)   NOT NULL DEFAULT 'CNF',
    coach_no          VARCHAR(4)    NULL,
    seat_no           INT           NULL,
    berth_type        VARCHAR(12)   NULL,
    PRIMARY KEY (id),
    KEY idx_bp_booking (booking_id),
    CONSTRAINT fk_bp_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,
    CONSTRAINT chk_bp_gender CHECK (gender IN ('M', 'F', 'O')),
    CONSTRAINT chk_bp_status CHECK (status IN ('CNF', 'CAN'))
);

CREATE TABLE seat_allocations (
    id                    BIGINT       NOT NULL AUTO_INCREMENT,
    seat_id               BIGINT       NOT NULL,
    booking_id            BIGINT       NOT NULL,
    booking_passenger_id  BIGINT       NOT NULL,
    from_seq              INT          NOT NULL,
    to_seq                INT          NOT NULL,
    status                VARCHAR(10)  NOT NULL DEFAULT 'HELD',
    expires_at            TIMESTAMP    NULL,
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_alloc_seat (seat_id, status, from_seq, to_seq),
    KEY idx_alloc_booking (booking_id),
    CONSTRAINT fk_alloc_seat    FOREIGN KEY (seat_id)              REFERENCES seats (id),
    CONSTRAINT fk_alloc_booking FOREIGN KEY (booking_id)           REFERENCES bookings (id) ON DELETE CASCADE,
    CONSTRAINT fk_alloc_bp      FOREIGN KEY (booking_passenger_id) REFERENCES booking_passengers (id) ON DELETE CASCADE,
    CONSTRAINT chk_alloc_status CHECK (status IN ('HELD', 'CONFIRMED', 'RELEASED')),
    CONSTRAINT chk_alloc_seq    CHECK (from_seq < to_seq)
);