-- Add columns the application code expects but are missing from the original api_keys table.
-- The table was created by 001_initial.sql using `label` / `is_revoked`; later code uses
-- `client_name`, `is_active`, and `permissions`.

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS client_name  TEXT,
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS permissions  JSONB   NOT NULL DEFAULT '[]';

-- Backfill client_name from the existing label column where available.
UPDATE api_keys SET client_name = label WHERE client_name IS NULL AND label IS NOT NULL;
UPDATE api_keys SET client_name = '' WHERE client_name IS NULL;

-- Reflect any previously-revoked keys in the new is_active column.
UPDATE api_keys SET is_active = NOT is_revoked WHERE is_revoked IS NOT NULL;

-- Create the api_key_usage_logs table that the application code references.
-- Note: api_key_id must be UUID to match api_keys.id from 001_initial.sql.
CREATE TABLE IF NOT EXISTS api_key_usage_logs (
  id          SERIAL PRIMARY KEY,
  api_key_id  UUID        NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint    VARCHAR     NOT NULL,
  method      VARCHAR     NOT NULL,
  status_code INTEGER     NOT NULL,
  accessed_at TIMESTAMP   NOT NULL DEFAULT NOW()
);
