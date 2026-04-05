import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import * as apiKeyModel from "../models/apiKeyModel";

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
    const activeKeys = await apiKeyModel.findAllActiveApiKeys();

    for (const key of activeKeys) {
      const match = await bcrypt.compare(token, key.key_hash);
      if (match) {
        req.apiKeyId = key.id;
        req.apiUserId = key.user_id;

        // Fire-and-forget — don't block the request on logging
        apiKeyModel.touchApiKey(key.id).catch(() => {});
        apiKeyModel.logApiKeyAccess(key.id, req.originalUrl).catch(() => {});

        return next();
      }
    }

    return res.status(401).json({ error: "Invalid or revoked API key" });
  } catch (err) {
    next(err);
  }
}
