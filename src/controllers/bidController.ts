import { Request, Response, NextFunction } from "express";
import * as bidService from "../services/bidService";

type SessionRequest = Request & { session: any; userId?: string };

export async function placeBid(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Amount must be > 0" });

    const profile = await bidService.getMonthlyProfile(userId);
    if (!profile) return res.status(404).json({ error: "Profile required" });

    const limit = profile.attended_event_this_month ? 4 : 3;
    if (Number(profile.monthly_win_count ?? 0) >= limit) {
      return res.status(403).json({ error: "Monthly win limit reached" });
    }

    const bidDate = bidService.getTomorrowDateString();
    const existing = await bidService.getExistingActiveBid(userId, bidDate);
    if (existing) return res.status(400).json({ error: "Already bid for tomorrow" });

    await bidService.insertBid(userId, bidDate, amount);
    return res.status(201).json({ message: "Bid placed", bid_date: bidDate });
  } catch (err) {
    next(err);
  }
}

export async function updateBid(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Amount must be > 0" });

    const bidDate = bidService.getTomorrowDateString();
    const current = await bidService.getExistingActiveBid(userId, bidDate);
    if (!current) return res.status(404).json({ error: "Active bid not found" });

    const currentAmount = Number(current.amount);
    if (amount <= currentAmount) return res.status(400).json({ error: "Amount must be greater than current" });

    await bidService.updateBidAmount(current.id, amount);
    return res.status(200).json({ message: "Bid updated" });
  } catch (err) {
    next(err);
  }
}

export async function cancelBid(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const bidDate = bidService.getTomorrowDateString();
    const cancelled = await bidService.cancelActiveBid(userId, bidDate);
    if (!cancelled) return res.status(404).json({ error: "Active bid not found" });

    return res.status(200).json({ message: "Bid cancelled" });
  } catch (err) {
    next(err);
  }
}

export async function statusBid(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const status = await bidService.getUserBidStatus(userId);
    return res.json(status);
  } catch (err) {
    next(err);
  }
}

export async function historyBid(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const bids = await bidService.getBidHistory(userId);
    return res.json({ bids });
  } catch (err) {
    next(err);
  }
}

export async function tomorrowSlot(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const slot = await bidService.getTomorrowSlot(userId);
    return res.json(slot);
  } catch (err) {
    next(err);
  }
}

export async function monthlyLimit(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const limit = await bidService.getMonthlyLimit(userId);
    if (!limit) return res.status(404).json({ error: "Profile not found" });

    return res.json(limit);
  } catch (err) {
    next(err);
  }
}
