
import { query } from "../config/db";


export async function findProfileByUserId(userId: string) {
  const r = await query("SELECT * FROM alumni_profiles WHERE user_id = $1", [userId]);
  return r.rows[0] ?? null;
}

export async function upsertAlumniProfile(
  userId: string,
  full_name: string | undefined,
  bio: string | undefined,
  linkedin_url: string | undefined,
  phone_number: string | undefined,
) {
  const r = await query(
    `INSERT INTO alumni_profiles (user_id, full_name, bio, linkedin_url, phone_number)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       full_name    = EXCLUDED.full_name,
       bio          = EXCLUDED.bio,
       linkedin_url = EXCLUDED.linkedin_url,
       phone_number = EXCLUDED.phone_number,
       updated_at   = NOW()
     RETURNING *`,
    [userId, full_name, bio, linkedin_url, phone_number],
  );
  return r.rows[0];
}

export async function updateProfileImage(userId: string, url: string) {
  await query(
    `INSERT INTO alumni_profiles (user_id, profile_image_url)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE
       SET profile_image_url = EXCLUDED.profile_image_url, updated_at = NOW()`,
    [userId, url],
  );
  const r = await query("SELECT * FROM alumni_profiles WHERE user_id = $1", [userId]);
  return r.rows[0];
}

export async function updateAttendance(userId: string, attended: boolean) {
  const r = await query(
    "UPDATE alumni_profiles SET attended_event_this_month = $1 WHERE user_id = $2 RETURNING *",
    [attended, userId],
  );
  return r.rows[0] ?? null;
}


export async function findDegreesByUserId(userId: string) {
  const r = await query("SELECT * FROM degrees WHERE user_id = $1", [userId]);
  return r.rows;
}

export async function findCertificationsByUserId(userId: string) {
  const r = await query("SELECT * FROM certifications WHERE user_id = $1", [userId]);
  return r.rows;
}

export async function findLicencesByUserId(userId: string) {
  const r = await query("SELECT * FROM licences WHERE user_id = $1", [userId]);
  return r.rows;
}

export async function findCoursesByUserId(userId: string) {
  const r = await query("SELECT * FROM professional_courses WHERE user_id = $1", [userId]);
  return r.rows;
}

export async function findEmploymentByUserId(userId: string) {
  const r = await query("SELECT * FROM employment_history WHERE user_id = $1", [userId]);
  return r.rows;
}

export async function insertSectionEntry(
  section: string,
  userId: string,
  keys: string[],
  values: unknown[],
) {
  const placeholders = keys.map((_, i) => `$${i + 2}`).join(", ");
  await query(
    `INSERT INTO ${section} (user_id, ${keys.join(", ")}) VALUES ($1, ${placeholders})`,
    [userId, ...values],
  );
}

export async function updateSectionEntry(
  section: string,
  id: string,
  userId: string,
  keys: string[],
  values: unknown[],
) {
  const sets = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
  const params = [...values, id, userId];
  const r = await query(
    `UPDATE ${section} SET ${sets}
     WHERE id = $${keys.length + 1} AND user_id = $${keys.length + 2}
     RETURNING *`,
    params,
  );
  return r.rows[0] ?? null;
}

export async function deleteSectionEntry(section: string, id: string, userId: string) {
  const r = await query(
    `DELETE FROM ${section} WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return r.rowCount ?? 0;
}


export async function findAlumniOfTheDay(today: string) {
  const r = await query(
    `SELECT bw.id AS bid_winner_id, bw.display_date,
            u.id AS user_id, u.email,
            p.full_name, p.bio, p.linkedin_url, p.phone_number, p.profile_image_url,
            p.monthly_win_count, p.attended_event_this_month
     FROM bid_winners bw
     JOIN bids          b ON b.id      = bw.bid_id
     JOIN users         u ON u.id      = bw.user_id
     JOIN alumni_profiles p ON p.user_id = u.id
     WHERE bw.display_date = $1 AND bw.is_active = true`,
    [today],
  );
  return r.rows[0] ?? null;
}
