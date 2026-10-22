CREATE TABLE users (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    email           VARCHAR(254)  NOT NULL,
    phone           VARCHAR(15)   NULL,
    password_hash   VARCHAR(255)  NOT NULL,
    role            VARCHAR(20)   NOT NULL DEFAULT 'USER',
    status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    email_verified  BOOLEAN       NOT NULL DEFAULT FALSE,
    failed_logins   INT           NOT NULL DEFAULT 0,
    locked_until    TIMESTAMP     NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email),
    UNIQUE KEY uk_users_phone (phone),
    CONSTRAINT chk_users_role   CHECK (role   IN ('USER', 'ADMIN')),
    CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'LOCKED', 'DELETED'))
);

CREATE TABLE user_profiles (
    user_id            BIGINT        NOT NULL,
    full_name          VARCHAR(100)  NOT NULL,
    date_of_birth      DATE          NULL,
    gender             CHAR(1)       NULL,
    preferred_class    VARCHAR(3)    NULL,
    preferred_berth    VARCHAR(20)   NULL,
    home_station_code VARCHAR(15)    NULL,
    language           VARCHAR(5)    NOT NULL DEFAULT 'en',
    notify_email       BOOLEAN       NOT NULL DEFAULT TRUE,
    notify_sms         BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_profiles_gender CHECK (gender IS NULL OR gender IN ('M', 'F', 'O'))
);

CREATE TABLE saved_passengers (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    user_id          BIGINT        NOT NULL,
    name             VARCHAR(100)  NOT NULL,
    date_of_birth    DATE          NOT NULL,
    gender           CHAR(1)       NOT NULL,
    berth_preference VARCHAR(20)   NULL,
    id_type          VARCHAR(20)   NULL,
    id_last4         CHAR(4)       NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_passengers_user (user_id),
    CONSTRAINT fk_passengers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_passengers_gender CHECK (gender IN ('M', 'F', 'O')),
    CONSTRAINT chk_passengers_id CHECK ((id_type IS NULL) = (id_last4 IS NULL))
);

CREATE TABLE refresh_tokens (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    user_id       BIGINT        NOT NULL,
    token_hash    CHAR(64)      NOT NULL,
    device_label  VARCHAR(150)  NULL,
    ip_address    VARCHAR(45)   NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at    TIMESTAMP     NOT NULL,
    revoked_at    TIMESTAMP     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_refresh_hash (token_hash),
    KEY idx_refresh_user (user_id),
    CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE one_time_tokens (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     BIGINT       NOT NULL,
    purpose     VARCHAR(30)  NOT NULL,
    token_hash  CHAR(64)     NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at  TIMESTAMP    NOT NULL,
    used_at     TIMESTAMP    NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ott_hash (token_hash),
    KEY idx_ott_user (user_id),
    CONSTRAINT fk_ott_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_ott_purpose CHECK (purpose IN ('VERIFY_EMAIL', 'RESET_PASSWORD'))
);