"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiKey = createApiKey;
exports.findApiKeysByUser = findApiKeysByUser;
exports.findApiKeyById = findApiKeyById;
exports.findKeyLogs = findKeyLogs;
exports.revokeApiKey = revokeApiKey;
exports.findActiveApiKeyByHash = findActiveApiKeyByHash;
exports.findAllActiveApiKeys = findAllActiveApiKeys;
exports.touchApiKey = touchApiKey;
exports.logApiKeyAccess = logApiKeyAccess;
const db_1 = require("../config/db");
async function createApiKey(userId, keyHash, clientName, permissions = []) {
    const r = await (0, db_1.query)(`INSERT INTO api_keys (user_id, key_hash, client_name, permissions)
     VALUES ($1, $2, $3, $4)
     RETURNING id, client_name, permissions, is_active, created_at`, [userId, keyHash, clientName, permissions]);
    return r.rows[0];
}
async function findApiKeysByUser(userId) {
    const r = await (0, db_1.query)("SELECT id, client_name, permissions, is_active, created_at FROM api_keys WHERE user_id = $1", [userId]);
    return r.rows;
}
async function findApiKeyById(id, userId) {
    const r = await (0, db_1.query)("SELECT id, client_name, permissions, is_active, created_at FROM api_keys WHERE id = $1 AND user_id = $2", [id, userId]);
    return r.rows[0] ?? null;
}
async function findKeyLogs(apiKeyId) {
    const r = await (0, db_1.query)(`SELECT endpoint, method, status_code, accessed_at
     FROM api_key_usage_logs
     WHERE api_key_id = $1
     ORDER BY accessed_at DESC
     LIMIT 20`, [apiKeyId]);
    return r.rows;
}
async function revokeApiKey(id, userId) {
    const r = await (0, db_1.query)("UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId]);
    return (r.rowCount ?? 0) > 0;
}
async function findActiveApiKeyByHash(keyHash) {
    const r = await (0, db_1.query)("SELECT id, user_id FROM api_keys WHERE key_hash = $1 AND is_active = TRUE LIMIT 1", [keyHash]);
    return r.rows[0] ?? null;
}
async function findAllActiveApiKeys() {
    const r = await (0, db_1.query)("SELECT id, user_id, key_hash FROM api_keys WHERE is_active = TRUE", []);
    return r.rows;
}
async function touchApiKey(_id) {
    // Usage is recorded via api_key_usage_logs; no last_used_at column exists
    return;
}
async function logApiKeyAccess(id, endpoint, method, statusCode) {
    await (0, db_1.query)(`INSERT INTO api_key_usage_logs (api_key_id, endpoint, method, status_code)
     VALUES ($1, $2, $3, $4)`, [id, endpoint, method, statusCode]);
}
//# sourceMappingURL=apiKeyModel.js.map