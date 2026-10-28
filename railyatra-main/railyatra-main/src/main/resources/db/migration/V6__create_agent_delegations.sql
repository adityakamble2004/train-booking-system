CREATE TABLE agent_delegations (
    id                          BIGINT       NOT NULL AUTO_INCREMENT,
    owner_user_id               BIGINT       NOT NULL,
    name                        VARCHAR(60)  NOT NULL,
    status                      VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE',
    scopes                      VARCHAR(200) NOT NULL,
    max_fare_per_booking_paise  INT          NOT NULL,
    max_spend_24h_paise         INT          NOT NULL,
    max_passengers              INT          NOT NULL DEFAULT 4,
    allowed_classes             VARCHAR(40)  NULL,
    saved_passengers_only       BOOLEAN      NOT NULL DEFAULT TRUE,
    expires_at                  TIMESTAMP    NOT NULL,
    created_at                  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at                  TIMESTAMP    NULL,
    PRIMARY KEY (id),
    KEY idx_deleg_owner (owner_user_id, status),
    CONSTRAINT fk_deleg_owner FOREIGN KEY (owner_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_deleg_status CHECK (status IN ('ACTIVE', 'REVOKED')),
    CONSTRAINT chk_deleg_passengers CHECK (max_passengers BETWEEN 1 AND 6)
);

CREATE TABLE agent_actions (
    id             BIGINT        NOT NULL AUTO_INCREMENT,
    delegation_id  BIGINT        NOT NULL,
    actor          VARCHAR(10)   NOT NULL DEFAULT 'API',
    method         VARCHAR(8)    NULL,
    path           VARCHAR(200)  NULL,
    query          VARCHAR(500)  NULL,
    status_code    INT           NULL,
    summary        VARCHAR(500)  NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_actions_deleg (delegation_id, id),
    CONSTRAINT fk_actions_deleg FOREIGN KEY (delegation_id) REFERENCES agent_delegations (id) ON DELETE CASCADE
);

ALTER TABLE bookings
    ADD COLUMN created_by_delegation_id BIGINT NULL,
    ADD KEY idx_bookings_deleg (created_by_delegation_id, created_at),
    ADD CONSTRAINT fk_booking_deleg FOREIGN KEY (created_by_delegation_id) REFERENCES agent_delegations (id);