import { Request, Response, NextFunction } from "express";
import { query } from "../config/db";

type SessionRequest = Request & { session: any; userId?: string; userRole?: string };

// Helper to fetch profile and sub-resources
async function getFullProfile(userId: string) {
  const profileRes = await query("SELECT * FROM alumni_profiles WHERE user_id = $1", [userId]);
  const profile = profileRes.rows[0];
  if (!profile) return null;

  const [degrees, certifications, licences, courses, employment] = await Promise.all([
    query("SELECT * FROM degrees WHERE user_id = $1", [userId]),
    query("SELECT * FROM certifications WHERE user_id = $1", [userId]),
    query("SELECT * FROM licences WHERE user_id = $1", [userId]),
    query("SELECT * FROM professional_courses WHERE user_id = $1", [userId]),
    query("SELECT * FROM employment_history WHERE user_id = $1", [userId]),
  ]);

  return {
    ...profile,
    degrees: degrees.rows,
    certifications: certifications.rows,
    licences: licences.rows,
    professional_courses: courses.rows,
    employment_history: employment.rows,
  };
}

export async function getProfile(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const profile = await getFullProfile(userId);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    return res.json(profile);
  } catch (err) {
    next(err);
  }
}

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

export async function updateProfile(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    let { full_name, bio, linkedin_url, phone_number } = req.body;

    if (linkedin_url && !/^https?:\/\//i.test(linkedin_url)) {
      linkedin_url = `https://${linkedin_url}`;
    }

    const r = await query(
      "UPDATE alumni_profiles SET full_name = $1, bio = $2, linkedin_url = $3, phone_number = $4, updated_at = NOW() WHERE user_id = $5 RETURNING *",
      [full_name, bio, linkedin_url, phone_number, userId],
    );

    if (r.rowCount === 0) {
      await query(
        "INSERT INTO alumni_profiles (user_id, full_name, bio, linkedin_url, phone_number) VALUES ($1,$2,$3,$4,$5)",
        [userId, full_name, bio, linkedin_url, phone_number],
      );
      return res.json({ message: "Profile created" });
    }

    return res.json(r.rows[0]);
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
    const r = await query(
      "UPDATE alumni_profiles SET profile_image_url = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *",
      [profileImageUrl, userId],
    );

    return res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function completion(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const profile = await getFullProfile(userId);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const total = 7;
    let filled = 0;
    if (profile.full_name) filled++;
    if (profile.bio) filled++;
    if (profile.linkedin_url) filled++;
    if (profile.profile_image_url) filled++;
    if (profile.degrees.length) filled++;
    if (profile.certifications.length) filled++;
    if (profile.employment_history.length) filled++;

    const percent = Math.round((filled / total) * 100);
    return res.json({ completion: percent });
  } catch (err) {
    next(err);
  }
}

async function upsertSection(userId: string, section: string, data: any, id?: string) {
  const table = section;
  const keys = Object.keys(data);
  const values = Object.values(data);

  if (id) {
    const sets = keys.map((key, idx) => `${key} = $${idx + 1}`).join(", ");
    await query(`UPDATE ${table} SET ${sets} WHERE id = $${keys.length + 1} AND user_id = $${keys.length + 2}`, [
      ...values,
      id,
      userId,
    ]);
    return;
  }

  await query(
    `INSERT INTO ${table} (user_id, ${keys.join(",")}) VALUES ($1, ${keys.map((v, i) => `$${i + 2}`).join(",")})`,
    [userId, ...values],
  );
}

export async function createSectionEntry(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const section = String(req.params.section);
    const valid = ["degrees", "certifications", "licences", "professional_courses", "employment_history"];
    if (!valid.includes(section)) {
      return res.status(400).json({ error: "Invalid section" });
    }

    const data = sanitizeSectionData(req.body);

    if (data.url && !/^https?:\/\//.test(data.url)) {
      return res.status(400).json({ error: "URL must be valid" });
    }

    await upsertSection(userId, section, data);
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
    const valid = ["degrees", "certifications", "licences", "professional_courses", "employment_history"];
    if (!valid.includes(section)) {
      return res.status(400).json({ error: "Invalid section" });
    }

    const data = sanitizeSectionData(req.body);

    if (data.url && !/^https?:\/\//.test(data.url)) {
      return res.status(400).json({ error: "URL must be valid" });
    }

    await upsertSection(userId, section, data, id);
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
    const valid = ["degrees", "certifications", "licences", "professional_courses", "employment_history"];
    if (!valid.includes(section)) {
      return res.status(400).json({ error: "Invalid section" });
    }

    const result = await query(`DELETE FROM ${section} WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (result.rowCount === 0) {
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

    const update = await query(
      "UPDATE alumni_profiles SET attended_event_this_month = $1 WHERE user_id = $2 RETURNING *",
      [attended === true, targetUserId],
    );

    if (update.rowCount === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.json(update.rows[0]);
  } catch (err) {
    next(err);
  }
}
