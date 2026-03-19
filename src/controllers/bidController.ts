import { Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import type { AuthRequest } from "../middleware/auth";
import type { PlaceBidBody, BidStatusResponse } from "../types/api";
import { getProfileByUserId } from "../services/profileService";
import { placeBid, getBidStatus } from "../services/bidService";

export async function placeBidHandler(req: AuthRequest, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const profile = await getProfileByUserId(userId);
  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const body = req.body as PlaceBidBody;
  const amount = Number(body.amount);

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Amount must be a positive number" });
  }

  try {
    await placeBid(profile.id, amount);
    return res.status(201).json({ status: "submitted" });
  } catch (err) {
    next(err);
  }
}

export async function getBidStatusHandler(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const profile = await getProfileByUserId(userId);
  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  try {
    const status = await getBidStatus(profile.id);
    const response: BidStatusResponse = { status };
    return res.json(response);
  } catch (err) {
    next(err);
  }
}
