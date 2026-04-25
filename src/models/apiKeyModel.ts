
import { query } from "../config/db";

export async function createApiKey(
  userId: string,
  keyHash: string,
  clientName: string,
  permissions: string[] = []
) {
  const r = await query(
    `INSERT INTO api_keys (user_id, key_hash, client_name, permissions)
     VALUES ($1, $2, $3, $4)
     RETURNING id, client_name, permissions, is_active, created_at`,
    [userId, keyHash, clientName, permissions],
  );
  return r.rows[0];
}

export async function findApiKeysByUser(userId: string) {
  const r = await query(
    "SELECT id, client_name, permissions, is_active, created_at FROM api_keys WHERE user_id = $1",
    [userId],
  );
  return r.rows;
}

export async function findApiKeyById(id: string, userId: string) {
  const r = await query(
    "SELECT id, client_name, permissions, is_active, created_at FROM api_keys WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return r.rows[0] ?? null;
}

export async function findKeyLogs(apiKeyId: string) {
  const r = await query(
    `SELECT endpoint, method, status_code, accessed_at
     FROM api_key_usage_logs
     WHERE api_key_id = $1
     ORDER BY accessed_at DESC
     LIMIT 20`,
    [apiKeyId],
  );
  return r.rows;
}

export async function revokeApiKey(id: string, userId: string) {
  const r = await query(
    "UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId],
  );
  return (r.rowCount ?? 0) > 0;
}

export async function findActiveApiKeyByHash(keyHash: string) {
  const r = await query(
    "SELECT id, user_id FROM api_keys WHERE key_hash = $1 AND is_active = TRUE LIMIT 1",
    [keyHash],
  );
  return r.rows[0] ?? null;
}

export async function findAllActiveApiKeys() {
  const r = await query(
    "SELECT id, user_id, key_hash FROM api_keys WHERE is_active = TRUE",
    [],
  );
  return r.rows as { id: string; user_id: string; key_hash: string }[];
}

export async function touchApiKey(_id: string) {
  // Usage is recorded via api_key_usage_logs; no last_used_at column exists
  return;
}

export async function logApiKeyAccess(id: string, endpoint: string, method: string, statusCode: number) {
  await query(
    `INSERT INTO api_key_usage_logs (api_key_id, endpoint, method, status_code)
     VALUES ($1, $2, $3, $4)`,
    [id, endpoint, method, statusCode],
  );
}
