import { Request, Response, NextFunction } from "express";
import { query } from "../config/db";

export async function getAlumniOfTheDay(req: Request, res: Response, next: NextFunction) {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const w = await query(
      `SELECT bw.id as bid_winner_id, bw.display_date, u.id as user_id, u.email,
              p.full_name, p.bio, p.linkedin_url, p.phone_number, p.profile_image_url,
              p.monthly_win_count, p.attended_event_this_month
       FROM bid_winners bw
       JOIN bids b ON b.id = bw.bid_id
       JOIN users u ON u.id = bw.user_id
       JOIN alumni_profiles p ON p.user_id = u.id
       WHERE bw.display_date = $1 AND bw.is_active = true`,
      [today],
    );

    if (w.rowCount === 0) {
      return res.status(404).json({ message: "No alumni of the day" });
    }

    const row = w.rows[0];
    const [degrees, certifications, licences, courses, employment] = await Promise.all([
      query("SELECT * FROM degrees WHERE user_id = $1", [row.user_id]),
      query("SELECT * FROM certifications WHERE user_id = $1", [row.user_id]),
      query("SELECT * FROM licences WHERE user_id = $1", [row.user_id]),
      query("SELECT * FROM professional_courses WHERE user_id = $1", [row.user_id]),
      query("SELECT * FROM employment_history WHERE user_id = $1", [row.user_id]),
    ]);

    return res.json({
      ...row,
      degrees: degrees.rows,
      certifications: certifications.rows,
      licences: licences.rows,
      professional_courses: courses.rows,
      employment_history: employment.rows,
    });
  } catch (err) {
    next(err);
  }
}
