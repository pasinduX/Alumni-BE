import { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth";
import type { UpdateProfileBody } from "../types/api";
import {
  getProfileByUserId,
  upsertProfileByUserId,
  setProfileAvatar,
} from "../services/profileService";

export async function getMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const profile = await getProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function updateMyProfile(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const body = req.body as UpdateProfileBody;

  try {
    const updated = await upsertProfileByUserId(userId, body);
    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function uploadProfileImage(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const imagePath = `/uploads/${req.file.filename}`;

  try {
    const profile = await setProfileAvatar(userId, imagePath);
    return res.json({ profile });
  } catch (err) {
    next(err);
  }
}
