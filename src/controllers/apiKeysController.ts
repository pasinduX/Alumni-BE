import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { query } from "../config/db";

type SessionRequest = Request & { session: any; userId?: string };

const SALT_ROUNDS = 12;

export async function generateKey(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { label } = req.body;
    const plainKey = `ak_${crypto.randomBytes(24).toString("hex")}`;
    const keyHash = await bcrypt.hash(plainKey, SALT_ROUNDS);

    const result = await query(
      "INSERT INTO api_keys (user_id, key_hash, label) VALUES ($1,$2,$3) RETURNING id, label, created_at",
      [userId, keyHash, label],
    );

    return res.status(201).json({ key: plainKey, ...result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function listKeys(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await query(
      "SELECT id,label,is_revoked,usage_count,last_used_at,created_at FROM api_keys WHERE user_id = $1",
      [userId],
    );

    return res.json({ keys: result.rows });
  } catch (err) {
    next(err);
  }
}

export async function keyStats(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const apiKeyId = req.params.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const key = await query("SELECT id, usage_count, last_used_at FROM api_keys WHERE id = $1 AND user_id = $2", [apiKeyId, userId]);
    if (key.rowCount === 0) return res.status(404).json({ error: "Not found" });

    const logs = await query("SELECT endpoint, accessed_at FROM api_key_logs WHERE api_key_id = $1 ORDER BY accessed_at DESC LIMIT 20", [apiKeyId]);
    return res.json({ ...key.rows[0], logs: logs.rows });
  } catch (err) {
    next(err);
  }
}

export async function revokeKey(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const apiKeyId = req.params.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await query("UPDATE api_keys SET is_revoked = true WHERE id = $1 AND user_id = $2 RETURNING id", [apiKeyId, userId]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Not found" });

    return res.json({ message: "Revoked" });
  } catch (err) {
    next(err);
  }
}
