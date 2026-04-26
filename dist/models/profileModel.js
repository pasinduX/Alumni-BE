"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findProfileByUserId = findProfileByUserId;
exports.upsertAlumniProfile = upsertAlumniProfile;
exports.updateProfileImage = updateProfileImage;
exports.updateAttendance = updateAttendance;
exports.findDegreesByUserId = findDegreesByUserId;
exports.findCertificationsByUserId = findCertificationsByUserId;
exports.findLicencesByUserId = findLicencesByUserId;
exports.findCoursesByUserId = findCoursesByUserId;
exports.findEmploymentByUserId = findEmploymentByUserId;
exports.insertSectionEntry = insertSectionEntry;
exports.updateSectionEntry = updateSectionEntry;
exports.deleteSectionEntry = deleteSectionEntry;
exports.findAlumniOfTheDay = findAlumniOfTheDay;
const db_1 = require("../config/db");
async function findProfileByUserId(userId) {
    const r = await (0, db_1.query)("SELECT * FROM alumni_profiles WHERE user_id = $1", [userId]);
    return r.rows[0] ?? null;
}
async function upsertAlumniProfile(userId, full_name, bio, linkedin_url, phone_number) {
    const r = await (0, db_1.query)(`INSERT INTO alumni_profiles (user_id, full_name, bio, linkedin_url, phone_number)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       full_name    = EXCLUDED.full_name,
       bio          = EXCLUDED.bio,
       linkedin_url = EXCLUDED.linkedin_url,
       phone_number = EXCLUDED.phone_number,
       updated_at   = NOW()
     RETURNING *`, [userId, full_name, bio, linkedin_url, phone_number]);
    return r.rows[0];
}
async function updateProfileImage(userId, url) {
    await (0, db_1.query)(`INSERT INTO alumni_profiles (user_id, profile_image_url)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE
       SET profile_image_url = EXCLUDED.profile_image_url, updated_at = NOW()`, [userId, url]);
    const r = await (0, db_1.query)("SELECT * FROM alumni_profiles WHERE user_id = $1", [userId]);
    return r.rows[0];
}
async function updateAttendance(userId, attended) {
    const r = await (0, db_1.query)("UPDATE alumni_profiles SET attended_event_this_month = $1 WHERE user_id = $2 RETURNING *", [attended, userId]);
    return r.rows[0] ?? null;
}
async function findDegreesByUserId(userId) {
    const r = await (0, db_1.query)("SELECT * FROM degrees WHERE user_id = $1", [userId]);
    return r.rows;
}
async function findCertificationsByUserId(userId) {
    const r = await (0, db_1.query)("SELECT * FROM certifications WHERE user_id = $1", [userId]);
    return r.rows;
}
async function findLicencesByUserId(userId) {
    const r = await (0, db_1.query)("SELECT * FROM licences WHERE user_id = $1", [userId]);
    return r.rows;
}
async function findCoursesByUserId(userId) {
    const r = await (0, db_1.query)("SELECT * FROM professional_courses WHERE user_id = $1", [userId]);
    return r.rows;
}
async function findEmploymentByUserId(userId) {
    const r = await (0, db_1.query)("SELECT * FROM employment_history WHERE user_id = $1", [userId]);
    return r.rows;
}
async function insertSectionEntry(section, userId, keys, values) {
    const placeholders = keys.map((_, i) => `$${i + 2}`).join(", ");
    await (0, db_1.query)(`INSERT INTO ${section} (user_id, ${keys.join(", ")}) VALUES ($1, ${placeholders})`, [userId, ...values]);
}
async function updateSectionEntry(section, id, userId, keys, values) {
    const sets = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
    const params = [...values, id, userId];
    const r = await (0, db_1.query)(`UPDATE ${section} SET ${sets}
     WHERE id = $${keys.length + 1} AND user_id = $${keys.length + 2}
     RETURNING *`, params);
    return r.rows[0] ?? null;
}
async function deleteSectionEntry(section, id, userId) {
    const r = await (0, db_1.query)(`DELETE FROM ${section} WHERE id = $1 AND user_id = $2`, [id, userId]);
    return r.rowCount ?? 0;
}
async function findAlumniOfTheDay(today) {
    const r = await (0, db_1.query)(`SELECT bw.id AS bid_winner_id, bw.display_date,
            u.id AS user_id, u.email,
            p.full_name, p.bio, p.linkedin_url, p.phone_number, p.profile_image_url,
            p.monthly_win_count, p.attended_event_this_month
     FROM bid_winners bw
     JOIN bids          b ON b.id      = bw.bid_id
     JOIN users         u ON u.id      = bw.user_id
     JOIN alumni_profiles p ON p.user_id = u.id
     WHERE bw.display_date = $1 AND bw.is_active = true`, [today]);
    return r.rows[0] ?? null;
}
//# sourceMappingURL=profileModel.js.map