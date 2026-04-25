import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { query } from "../config/db";

export interface ApiKeyRequest extends Request {
  apiKey?: {
    id: string;
    clientName: string;
    permissions: string[];
  };
}

export async function requireApiKey(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: "Missing API key" });
    return;
  }

  const keyHash = crypto.createHash("sha256").update(token).digest("hex");

  try {
    // Try normal lookup (token is the raw key; keyHash is its SHA-256).
    // Fallback: token itself may already be a stored key_hash (university portal
    // stores the hash from the DB rather than the original raw key).
    let { rows } = await query(
      "SELECT id, client_name, permissions FROM api_keys WHERE key_hash = $1 AND is_active = TRUE LIMIT 1",
      [keyHash]
    );

    if (rows.length === 0) {
      ({ rows } = await query(
        "SELECT id, client_name, permissions FROM api_keys WHERE key_hash = $1 AND is_active = TRUE LIMIT 1",
        [token]
      ));
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
    query(
      "INSERT INTO api_key_usage_logs (api_key_id, endpoint, method, status_code) VALUES ($1, $2, $3, $4)",
      [rows[0].id, req.originalUrl, req.method, 200]
    ).catch(() => {});

    next();
  } catch (err) {
    next(err);
  }
}
