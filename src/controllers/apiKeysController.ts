import { Request, Response, NextFunction } from "express";
import { generateApiKey, listApiKeys, getApiKeyStats, revokeApiKey } from "../services/apiKeysService";

type SessionRequest = Request & { session: any; userId?: string };

export async function generateKey(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { label } = req.body;
    const result = await generateApiKey(userId, label);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listKeys(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const keys = await listApiKeys(userId);
    return res.json({ keys });
  } catch (err) {
    next(err);
  }
}

export async function keyStats(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const stats = await getApiKeyStats(userId, String(req.params.id));
    return res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function revokeKey(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    await revokeApiKey(userId, String(req.params.id));
    return res.json({ message: "Revoked" });
  } catch (err) {
    next(err);
  }
}
