CREATE TABLE api_keys (
    id           SERIAL PRIMARY KEY,
    client_name  VARCHAR        NOT NULL,
    key_hash     VARCHAR        UNIQUE NOT NULL,
    permissions  JSONB,
    is_active    BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP      NOT NULL DEFAULT NOW()
);
