
import { query } from "../config/db";

export async function createApiKey(userId: string, keyHash: string, label: string) {
  const r = await query(
    "INSERT INTO api_keys (user_id, key_hash, label) VALUES ($1, $2, $3) RETURNING id, label, created_at",
    [userId, keyHash, label],
  );
  return r.rows[0];
}

export async function findApiKeysByUser(userId: string) {
  const r = await query(
    "SELECT id, label, is_revoked, usage_count, last_used_at, created_at FROM api_keys WHERE user_id = $1",
    [userId],
  );
  return r.rows;
}

export async function findApiKeyById(id: string, userId: string) {
  const r = await query(
    "SELECT id, usage_count, last_used_at FROM api_keys WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return r.rows[0] ?? null;
}

export async function findKeyLogs(apiKeyId: string) {
  const r = await query(
    "SELECT endpoint, accessed_at FROM api_key_logs WHERE api_key_id = $1 ORDER BY accessed_at DESC LIMIT 20",
    [apiKeyId],
  );
  return r.rows;
}

export async function revokeApiKey(id: string, userId: string) {
  const r = await query(
    "UPDATE api_keys SET is_revoked = true WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId],
  );
  return (r.rowCount ?? 0) > 0;
}

export async function findAllActiveApiKeys() {
  const r = await query(
    "SELECT id, user_id, key_hash FROM api_keys WHERE is_revoked = false",
    [],
  );
  return r.rows as { id: string; user_id: string; key_hash: string }[];
}

export async function touchApiKey(id: string) {
  await query(
    "UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = $1",
    [id],
  );
}

export async function logApiKeyAccess(id: string, endpoint: string) {
  await query(
    "INSERT INTO api_key_logs (api_key_id, endpoint) VALUES ($1, $2)",
    [id, endpoint],
  );
}
