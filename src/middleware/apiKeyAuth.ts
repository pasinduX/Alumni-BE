import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
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
    const keyHash = crypto.createHash("sha256").update(token).digest("hex");
    const key = await apiKeyModel.findActiveApiKeyByHash(keyHash);

    if (!key) {
      return res.status(401).json({ error: "Invalid or revoked API key" });
    }

    req.apiKeyId = key.id;
    req.apiUserId = key.user_id;
    apiKeyModel.touchApiKey(key.id).catch(() => {});
    apiKeyModel.logApiKeyAccess(key.id, req.originalUrl, req.method, 200).catch(() => {});

    return next();
  } catch (err) {
    next(err);
  }
}
