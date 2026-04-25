CREATE TABLE api_key_usage_logs (
    id          SERIAL PRIMARY KEY,
    api_key_id  INTEGER     NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint    VARCHAR     NOT NULL,
    method      VARCHAR     NOT NULL,
    status_code INTEGER     NOT NULL,
    accessed_at TIMESTAMP   NOT NULL DEFAULT NOW()
);
