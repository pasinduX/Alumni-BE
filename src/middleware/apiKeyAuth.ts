import { Request, Response, NextFunction } from "express";
import { query } from "../config/db";
import bcrypt from "bcrypt";

export interface APIRequest extends Request {
  apiUserId?: string;
  apiKeyId?: string;
}

export async function apiKeyAuth(req: APIRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Invalid or revoked API key" });
  }

  try {
    const row = await query("SELECT id, user_id, key_hash, is_revoked FROM api_keys WHERE is_revoked = false", []);
    for (const key of row.rows) {
      const match = await bcrypt.compare(token, key.key_hash);
      if (match) {
        req.apiKeyId = key.id;
        req.apiUserId = key.user_id;

        await query("UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = $1", [key.id]);
        await query("INSERT INTO api_key_logs(api_key_id, endpoint) VALUES($1, $2)", [key.id, req.originalUrl]);

        return next();
      }
    }
    return res.status(401).json({ error: "Invalid or revoked API key" });
  } catch (err) {
    next(err);
  }
}
