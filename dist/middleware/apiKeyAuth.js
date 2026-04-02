"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = apiKeyAuth;
const db_1 = require("../config/db");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function apiKeyAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!token) {
        return res.status(401).json({ error: "Invalid or revoked API key" });
    }
    try {
        const row = await (0, db_1.query)("SELECT id, user_id, key_hash, is_revoked FROM api_keys WHERE is_revoked = false", []);
        for (const key of row.rows) {
            const match = await bcrypt_1.default.compare(token, key.key_hash);
            if (match) {
                req.apiKeyId = key.id;
                req.apiUserId = key.user_id;
                await (0, db_1.query)("UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = $1", [key.id]);
                await (0, db_1.query)("INSERT INTO api_key_logs(api_key_id, endpoint) VALUES($1, $2)", [key.id, req.originalUrl]);
                return next();
            }
        }
        return res.status(401).json({ error: "Invalid or revoked API key" });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=apiKeyAuth.js.map