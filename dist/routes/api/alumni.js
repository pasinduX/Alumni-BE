"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const csv_stringify_1 = require("csv-stringify");
const db_1 = require("../../config/db");
const requireApiKey_1 = require("../../middleware/requireApiKey");
const requirePermission_1 = require("../../middleware/requirePermission");
const router = (0, express_1.Router)();
/**
 * GET /api/alumni
 *
 * Query params:
 *   programme        – filters by degree title (case-insensitive partial match)
 *   graduation_year  – filters by year of degree completion (YYYY)
 *   industry_sector  – filters by employment company or role (case-insensitive partial match)
 *   page             – page number (default 1)
 *   limit            – results per page (default 20, max 100)
 */
router.get("/alumni", requireApiKey_1.requireApiKey, (0, requirePermission_1.requirePermission)("read:alumni"), async (req, res, next) => {
    try {
        const { programme, graduation_year, industry_sector } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        // ── dynamic WHERE fragments ──────────────────────────────────────────
        const conditions = [];
        const params = [];
        if (programme) {
            params.push(`%${programme}%`);
            conditions.push(`EXISTS (
            SELECT 1 FROM degrees d
            WHERE d.user_id = u.id
              AND d.title ILIKE $${params.length}
          )`);
        }
        if (graduation_year) {
            const year = parseInt(graduation_year, 10);
            if (!isNaN(year)) {
                params.push(year);
                conditions.push(`EXISTS (
              SELECT 1 FROM degrees d
              WHERE d.user_id = u.id
                AND EXTRACT(YEAR FROM d.completed_at) = $${params.length}
            )`);
            }
        }
        if (industry_sector) {
            params.push(`%${industry_sector}%`);
            conditions.push(`EXISTS (
            SELECT 1 FROM employment_history eh
            WHERE eh.user_id = u.id
              AND (eh.company ILIKE $${params.length} OR eh.role ILIKE $${params.length})
          )`);
        }
        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        // ── count query ──────────────────────────────────────────────────────
        const countResult = await (0, db_1.query)(`SELECT COUNT(*) AS total
         FROM users u
         JOIN alumni_profiles ap ON ap.user_id = u.id
         ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].total, 10);
        // ── data query ───────────────────────────────────────────────────────
        const dataParams = [...params, limit, offset];
        const dataResult = await (0, db_1.query)(`SELECT
           u.id             AS user_id,
           u.email,
           ap.full_name,
           ap.bio,
           ap.linkedin_url,
           ap.profile_image_url,
           ap.updated_at
         FROM users u
         JOIN alumni_profiles ap ON ap.user_id = u.id
         ${whereClause}
         ORDER BY ap.full_name ASC NULLS LAST
         LIMIT $${dataParams.length - 1}
         OFFSET $${dataParams.length}`, dataParams);
        res.json({
            data: dataResult.rows,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/alumni/export
 *
 * Streams a CSV download of filtered alumni.
 * Accepts the same filter query params as GET /api/alumni.
 * Requires ?format=csv (default) — extend for other formats as needed.
 */
router.get("/alumni/export", requireApiKey_1.requireApiKey, (0, requirePermission_1.requirePermission)("read:alumni"), async (req, res, next) => {
    try {
        const { programme, graduation_year, industry_sector } = req.query;
        // ── dynamic WHERE (same logic as GET /api/alumni) ──────────────────
        const conditions = [];
        const params = [];
        if (programme) {
            params.push(`%${programme}%`);
            conditions.push(`EXISTS (
            SELECT 1 FROM degrees d
            WHERE d.user_id = u.id
              AND d.title ILIKE $${params.length}
          )`);
        }
        if (graduation_year) {
            const year = parseInt(graduation_year, 10);
            if (!isNaN(year)) {
                params.push(year);
                conditions.push(`EXISTS (
              SELECT 1 FROM degrees d
              WHERE d.user_id = u.id
                AND EXTRACT(YEAR FROM d.completed_at) = $${params.length}
            )`);
            }
        }
        if (industry_sector) {
            params.push(`%${industry_sector}%`);
            conditions.push(`EXISTS (
            SELECT 1 FROM employment_history eh
            WHERE eh.user_id = u.id
              AND (eh.company ILIKE $${params.length} OR eh.role ILIKE $${params.length})
          )`);
        }
        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        // ── full un-paginated query with enriched columns ──────────────────
        const result = await (0, db_1.query)(`SELECT
           u.id                                              AS user_id,
           u.email,
           ap.full_name,
           ap.linkedin_url,
           ap.phone_number,
           (
             SELECT d.title
             FROM degrees d
             WHERE d.user_id = u.id
             ORDER BY d.completed_at DESC NULLS LAST
             LIMIT 1
           )                                                AS programme,
           (
             SELECT EXTRACT(YEAR FROM d.completed_at)::int
             FROM degrees d
             WHERE d.user_id = u.id
             ORDER BY d.completed_at DESC NULLS LAST
             LIMIT 1
           )                                                AS graduation_year,
           (
             SELECT eh.role
             FROM employment_history eh
             WHERE eh.user_id = u.id
             ORDER BY eh.is_current DESC, eh.start_date DESC
             LIMIT 1
           )                                                AS current_role,
           (
             SELECT eh.company
             FROM employment_history eh
             WHERE eh.user_id = u.id
             ORDER BY eh.is_current DESC, eh.start_date DESC
             LIMIT 1
           )                                                AS current_employer,
           (
             SELECT eh.industry_sector
             FROM employment_history eh
             WHERE eh.user_id = u.id
             ORDER BY eh.is_current DESC, eh.start_date DESC
             LIMIT 1
           )                                                AS industry_sector
         FROM users u
         JOIN alumni_profiles ap ON ap.user_id = u.id
         ${whereClause}
         ORDER BY ap.full_name ASC NULLS LAST`, params);
        // ── stream CSV response ────────────────────────────────────────────
        const filename = `alumni-export-${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        const stringifier = (0, csv_stringify_1.stringify)({
            header: true,
            columns: [
                { key: "user_id", header: "User ID" },
                { key: "full_name", header: "Full Name" },
                { key: "email", header: "Email" },
                { key: "programme", header: "Programme" },
                { key: "graduation_year", header: "Graduation Year" },
                { key: "current_role", header: "Current Role" },
                { key: "current_employer", header: "Current Employer" },
                { key: "industry_sector", header: "Industry Sector" },
                { key: "linkedin_url", header: "LinkedIn" },
                { key: "phone_number", header: "Phone" },
            ],
            cast: {
                // Convert null/undefined to empty string
                object: (value) => (value === null || value === undefined ? "" : String(value)),
            },
        });
        stringifier.pipe(res);
        for (const row of result.rows) {
            stringifier.write(row);
        }
        stringifier.end();
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/alumni/:id
 *
 * Returns full profile for a single alumni user, with nested arrays for
 * degrees, certifications, licences, professional_courses, and employment_history.
 * The :id param is the users.id (UUID).
 */
router.get("/alumni/:id", requireApiKey_1.requireApiKey, (0, requirePermission_1.requirePermission)("read:alumni"), async (req, res, next) => {
    try {
        const { id } = req.params;
        // ── core profile ─────────────────────────────────────────────────────
        const profileResult = await (0, db_1.query)(`SELECT
           u.id          AS user_id,
           u.email,
           ap.id         AS profile_id,
           ap.full_name,
           ap.bio,
           ap.linkedin_url,
           ap.phone_number,
           ap.profile_image_url,
           ap.updated_at
         FROM users u
         JOIN alumni_profiles ap ON ap.user_id = u.id
         WHERE u.id = $1`, [id]);
        if (profileResult.rows.length === 0) {
            res.status(404).json({ error: "Alumni not found" });
            return;
        }
        const profile = profileResult.rows[0];
        // ── related data (parallel queries) ──────────────────────────────────
        const [degrees, certifications, licences, professionalCourses, employmentHistory] = await Promise.all([
            (0, db_1.query)(`SELECT id, title, institution, url, completed_at
             FROM degrees
             WHERE user_id = $1
             ORDER BY completed_at DESC NULLS LAST`, [id]),
            (0, db_1.query)(`SELECT id, title, provider, url, completed_at
             FROM certifications
             WHERE user_id = $1
             ORDER BY completed_at DESC NULLS LAST`, [id]),
            (0, db_1.query)(`SELECT id, title, awarding_body, url, completed_at
             FROM licences
             WHERE user_id = $1
             ORDER BY completed_at DESC NULLS LAST`, [id]),
            (0, db_1.query)(`SELECT id, title, provider, url, completed_at
             FROM professional_courses
             WHERE user_id = $1
             ORDER BY completed_at DESC NULLS LAST`, [id]),
            (0, db_1.query)(`SELECT id, company, role, start_date, end_date, is_current
             FROM employment_history
             WHERE user_id = $1
             ORDER BY is_current DESC, start_date DESC`, [id]),
        ]);
        res.json({
            user_id: profile.user_id,
            email: profile.email,
            profile_id: profile.profile_id,
            full_name: profile.full_name,
            bio: profile.bio,
            linkedin_url: profile.linkedin_url,
            phone_number: profile.phone_number,
            profile_image_url: profile.profile_image_url,
            updated_at: profile.updated_at,
            degrees: degrees.rows,
            certifications: certifications.rows,
            licences: licences.rows,
            professional_courses: professionalCourses.rows,
            employment_history: employmentHistory.rows,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=alumni.js.map