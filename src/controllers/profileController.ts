import { Request, Response, NextFunction } from "express";
import * as profileService from "../services/profileService";

type SessionRequest = Request & { session: any; userId?: string; userRole?: string };

function sanitizeSectionData(data: any) {
  const sanitized = { ...data };
  ["start_date", "end_date", "completed_at"].forEach((dateKey) => {
    if (sanitized[dateKey] === "" || sanitized[dateKey] === null || sanitized[dateKey] === undefined) {
      delete sanitized[dateKey];
    }
  });
  delete sanitized._csrf;
  delete sanitized.submit;
  return sanitized;
}

function validateSection(section: string) {
  const validSections = ["degrees", "certifications", "licences", "professional_courses", "employment_history"];
  return validSections.includes(section);
}

export async function getProfile(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const profile = await profileService.getFullProfile(userId);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    return res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    let { full_name, bio, linkedin_url, phone_number } = req.body;
    if (linkedin_url && !/^https?:\/\//i.test(linkedin_url)) {
      linkedin_url = `https://${linkedin_url}`;
    }

    const profile = await profileService.upsertProfile(userId, { full_name, bio, linkedin_url, phone_number } as any);
    return res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function uploadImage(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const profileImageUrl = `/uploads/${req.file.filename}`;
    const profile = await profileService.setProfileAvatar(userId, profileImageUrl);
    return res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function completion(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const percent = await profileService.getProfileCompletion(userId);
    if (percent === null) return res.status(404).json({ error: "Profile not found" });

    return res.json({ completion: percent });
  } catch (err) {
    next(err);
  }
}

export async function createSectionEntry(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const section = String(req.params.section);
    if (!validateSection(section)) {
      return res.status(400).json({ error: "Invalid section" });
    }

    const data = sanitizeSectionData(req.body);
    if (data.url && !/^https?:\/\//.test(data.url)) {
      return res.status(400).json({ error: "URL must be valid" });
    }

    await profileService.createSectionEntry(userId, section, data);
    return res.status(201).json({ message: "Entry created" });
  } catch (err) {
    next(err);
  }
}

export async function updateSectionEntry(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const section = String(req.params.section);
    const id = String(req.params.id);
    if (!validateSection(section)) {
      return res.status(400).json({ error: "Invalid section" });
    }

    const data = sanitizeSectionData(req.body);
    if (data.url && !/^https?:\/\//.test(data.url)) {
      return res.status(400).json({ error: "URL must be valid" });
    }

    const updated = await profileService.updateSectionEntry(userId, section, id, data);
    if (!updated) {
      return res.status(404).json({ error: "Not found or unauthorized" });
    }

    return res.json({ message: "Entry updated" });
  } catch (err) {
    next(err);
  }
}

export async function deleteSectionEntry(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const section = String(req.params.section);
    const id = String(req.params.id);
    if (!validateSection(section)) {
      return res.status(400).json({ error: "Invalid section" });
    }

    const deleted = await profileService.deleteSectionEntry(userId, section, id);
    if (!deleted) {
      return res.status(404).json({ error: "Not found or unauthorized" });
    }

    return res.json({ message: "Entry deleted" });
  } catch (err) {
    next(err);
  }
}

export async function setAttendance(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const { attended } = req.body;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    let targetUserId = userId;
    if (req.userRole === "admin" && req.body.userId) {
      targetUserId = req.body.userId;
    }

    const profile = await profileService.setAttendance(targetUserId, attended === true);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    return res.json(profile);
  } catch (err) {
    next(err);
  }
}
