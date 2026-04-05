/**
 * apiKeyModel — raw SQL query functions for the `api_keys` and
 * `api_key_logs` tables.
 * No business logic. Each function maps to exactly one SQL operation.
 */
import { query } from "../config/db";

/** Inserts a new API key and returns the created row (without the hash). */
export async function createApiKey(userId: string, keyHash: string, label: string) {
  const r = await query(
    "INSERT INTO api_keys (user_id, key_hash, label) VALUES ($1, $2, $3) RETURNING id, label, created_at",
    [userId, keyHash, label],
  );
  return r.rows[0];
}

/** Returns all API key rows (excluding hash) for a given user. */
export async function findApiKeysByUser(userId: string) {
  const r = await query(
    "SELECT id, label, is_revoked, usage_count, last_used_at, created_at FROM api_keys WHERE user_id = $1",
    [userId],
  );
  return r.rows;
}

/** Returns a single API key row for a given id + owner, or null. */
export async function findApiKeyById(id: string, userId: string) {
  const r = await query(
    "SELECT id, usage_count, last_used_at FROM api_keys WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return r.rows[0] ?? null;
}

/** Returns the 20 most-recent access log rows for an API key. */
export async function findKeyLogs(apiKeyId: string) {
  const r = await query(
    "SELECT endpoint, accessed_at FROM api_key_logs WHERE api_key_id = $1 ORDER BY accessed_at DESC LIMIT 20",
    [apiKeyId],
  );
  return r.rows;
}

/** Sets is_revoked = true. Returns true when a row was updated. */
export async function revokeApiKey(id: string, userId: string) {
  const r = await query(
    "UPDATE api_keys SET is_revoked = true WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId],
  );
  return (r.rowCount ?? 0) > 0;
}

// ─── Used by apiKeyAuth middleware ────────────────────────────────────────────

/** Returns all non-revoked keys (id, user_id, key_hash) for token verification. */
export async function findAllActiveApiKeys() {
  const r = await query(
    "SELECT id, user_id, key_hash FROM api_keys WHERE is_revoked = false",
    [],
  );
  return r.rows as { id: string; user_id: string; key_hash: string }[];
}

/** Increments usage_count and updates last_used_at for the given key. */
export async function touchApiKey(id: string) {
  await query(
    "UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = $1",
    [id],
  );
}

/** Appends an access-log row for the given key and endpoint. */
export async function logApiKeyAccess(id: string, endpoint: string) {
  await query(
    "INSERT INTO api_key_logs (api_key_id, endpoint) VALUES ($1, $2)",
    [id, endpoint],
  );
}
