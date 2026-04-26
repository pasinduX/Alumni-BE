"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApiKey = requireApiKey;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../config/db");
async function requireApiKey(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!token) {
        res.status(401).json({ error: "Missing API key" });
        return;
    }
    const keyHash = crypto_1.default.createHash("sha256").update(token).digest("hex");
    try {
        // Try normal lookup (token is the raw key; keyHash is its SHA-256).
        // Fallback: token itself may already be a stored key_hash (university portal
        // stores the hash from the DB rather than the original raw key).
        let { rows } = await (0, db_1.query)("SELECT id, client_name, permissions FROM api_keys WHERE key_hash = $1 AND is_active = TRUE LIMIT 1", [keyHash]);
        if (rows.length === 0) {
            ({ rows } = await (0, db_1.query)("SELECT id, client_name, permissions FROM api_keys WHERE key_hash = $1 AND is_active = TRUE LIMIT 1", [token]));
        }
        if (rows.length === 0) {
            res.status(401).json({ error: "Invalid or revoked API key" });
            return;
        }
        req.apiKey = {
            id: rows[0].id,
            clientName: rows[0].client_name,
            permissions: Array.isArray(rows[0].permissions) ? rows[0].permissions : [],
        };
        // Log usage asynchronously — do not block the request
        (0, db_1.query)("INSERT INTO api_key_usage_logs (api_key_id, endpoint, method, status_code) VALUES ($1, $2, $3, $4)", [rows[0].id, req.originalUrl, req.method, 200]).catch(() => { });
        next();
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=requireApiKey.js.map