import { Router, Response, NextFunction } from "express";
import { query } from "../../config/db";
import { requireApiKey, ApiKeyRequest } from "../../middleware/requireApiKey";
import { requirePermission } from "../../middleware/requirePermission";

const router = Router();

/**
 * GET /api/analytics/skills-gap
 *
 * Aggregates certifications and professional_courses by title + provider,
 * returns the top 20 most common entries sorted by count descending.
 */
router.get(
  "/analytics/skills-gap",
  requireApiKey,
  requirePermission("read:analytics"),
  async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const programme = req.query.programme as string | undefined;

      let totalAlumni = 0;
      let rows: any[];

      if (programme) {
        const param = `%${programme}%`;
        const [countRes, dataRes] = await Promise.all([
          query(
            `SELECT COUNT(DISTINCT user_id) AS total FROM degrees WHERE title ILIKE $1`,
            [param]
          ),
          query(
            `SELECT title, provider, COUNT(*) AS count
             FROM (
               SELECT c.title, c.provider
               FROM certifications c
               WHERE c.user_id IN (SELECT DISTINCT user_id FROM degrees WHERE title ILIKE $1)
               UNION ALL
               SELECT p.title, p.provider
               FROM professional_courses p
               WHERE p.user_id IN (SELECT DISTINCT user_id FROM degrees WHERE title ILIKE $1)
             ) AS combined
             GROUP BY title, provider
             ORDER BY count DESC
             LIMIT 20`,
            [param]
          ),
        ]);
        totalAlumni = parseInt(countRes.rows[0]?.total ?? "0", 10);
        rows = dataRes.rows;
      } else {
        const [countRes, dataRes] = await Promise.all([
          query(`SELECT COUNT(*) AS total FROM alumni_profiles`, []),
          query(
            `SELECT title, provider, COUNT(*) AS count
             FROM (
               SELECT title, provider FROM certifications
               UNION ALL
               SELECT title, provider FROM professional_courses
             ) AS combined
             GROUP BY title, provider
             ORDER BY count DESC
             LIMIT 20`,
            []
          ),
        ]);
        totalAlumni = parseInt(countRes.rows[0]?.total ?? "0", 10);
        rows = dataRes.rows;
      }

      const data = rows.map((row) => ({
        title:            row.title    as string,
        provider:         row.provider as string | null,
        count:            parseInt(row.count, 10),
        pct_of_graduates: totalAlumni > 0
          ? Math.round((parseInt(row.count, 10) / totalAlumni) * 100)
          : 0,
      }));

      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/analytics/employment-by-sector
 *
 * Groups employment_history by industry_sector and returns counts
 * sorted by count descending. Rows with no sector are labelled "Unknown".
 */
router.get(
  "/analytics/employment-by-sector",
  requireApiKey,
  requirePermission("read:analytics"),
  async (_req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await query(
        `SELECT
           COALESCE(NULLIF(TRIM(industry_sector), ''), 'Unknown') AS sector,
           COUNT(*) AS count
         FROM employment_history
         GROUP BY COALESCE(NULLIF(TRIM(industry_sector), ''), 'Unknown')
         ORDER BY count DESC`,
        []
      );

      const data = result.rows.map((row) => ({
        sector: row.sector as string,
        count:  parseInt(row.count, 10),
      }));

      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/analytics/job-titles
 *
 * Groups employment_history by role, returns the top 15 most common
 * job titles sorted by count descending.
 */
router.get(
  "/analytics/job-titles",
  requireApiKey,
  requirePermission("read:analytics"),
  async (_req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await query(
        `SELECT
           COALESCE(NULLIF(TRIM(role), ''), 'Unknown') AS role,
           COUNT(*) AS count
         FROM employment_history
         GROUP BY role
         ORDER BY count DESC
         LIMIT 15`,
        []
      );

      const data = result.rows.map((row) => ({
        role:  row.role as string,
        count: parseInt(row.count, 10),
      }));

      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/analytics/top-employers
 *
 * Groups employment_history by company, returns the top 10 most common
 * employers sorted by count descending.
 */
router.get(
  "/analytics/top-employers",
  requireApiKey,
  requirePermission("read:analytics"),
  async (_req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await query(
        `SELECT
           COALESCE(NULLIF(TRIM(company), ''), 'Unknown') AS company,
           COUNT(*) AS count
         FROM employment_history
         GROUP BY company
         ORDER BY count DESC
         LIMIT 10`,
        []
      );

      const data = result.rows.map((row) => ({
        company: row.company as string,
        count:   parseInt(row.count, 10),
      }));

      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/analytics/certification-trends
 *
 * Groups certifications by month (YYYY-MM) for the last 12 months,
 * returns array of {month, count} ordered by month ascending.
 */
router.get(
  "/analytics/certification-trends",
  requireApiKey,
  requirePermission("read:analytics"),
  async (_req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await query(
        `SELECT
           TO_CHAR(COALESCE(completed_at, CURRENT_DATE), 'YYYY-MM') AS month,
           COUNT(*) AS count
         FROM certifications
         WHERE COALESCE(completed_at, CURRENT_DATE) >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
           AND COALESCE(completed_at, CURRENT_DATE) <  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
         GROUP BY month
         ORDER BY month ASC`,
        []
      );

      const data = result.rows.map((row) => ({
        month: row.month as string,
        count: parseInt(row.count, 10),
      }));

      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/analytics/usage-stats
 *
 * Aggregates api_key_usage_logs joined with api_keys, grouped by api_key_id.
 * Returns array of {client_name, total_calls, last_accessed, unique_endpoints}.
 */
router.get(
  "/analytics/usage-stats",
  requireApiKey,
  requirePermission("read:analytics"),
  async (_req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await query(
        `SELECT
           ak.client_name,
           COUNT(ul.id)                    AS total_calls,
           MAX(ul.accessed_at)             AS last_accessed,
           COUNT(DISTINCT ul.endpoint)     AS unique_endpoints
         FROM api_keys ak
         LEFT JOIN api_key_usage_logs ul ON ul.api_key_id = ak.id
         GROUP BY ak.id, ak.client_name
         ORDER BY total_calls DESC`,
        []
      );

      const data = result.rows.map((row) => ({
        client_name:      row.client_name as string,
        total_calls:      parseInt(row.total_calls, 10),
        last_accessed:    row.last_accessed as string | null,
        unique_endpoints: parseInt(row.unique_endpoints, 10),
      }));

      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/analytics/programme-list
 * Returns distinct degree programme titles — used to populate filter dropdowns.
 */
router.get(
  "/analytics/programme-list",
  requireApiKey,
  requirePermission("read:analytics"),
  async (_req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await query(
        `SELECT DISTINCT title AS programme
         FROM degrees
         WHERE title IS NOT NULL AND TRIM(title) <> ''
         ORDER BY title`,
        []
      );
      res.json(result.rows.map((r) => r.programme as string));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/analytics/career-pathways
 *
 * Scenario 2 — Emerging Career Pathways.
 * ?programme= (optional): if given, returns {programme, total_alumni, sectors, roles}
 *   with counts and percentage of that cohort for each sector/role.
 * Without ?programme: returns summary of all programmes with their top sector & role.
 */
router.get(
  "/analytics/career-pathways",
  requireApiKey,
  requirePermission("read:analytics"),
  async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const programme = req.query.programme as string | undefined;

      if (programme) {
        const param = `%${programme}%`;
        const [totalRes, sectorsRes, rolesRes] = await Promise.all([
          query(
            `SELECT COUNT(DISTINCT user_id) AS total FROM degrees WHERE title ILIKE $1`,
            [param]
          ),
          query(
            `SELECT
               COALESCE(NULLIF(TRIM(eh.industry_sector), ''), 'Unknown') AS sector,
               COUNT(DISTINCT eh.user_id) AS count
             FROM employment_history eh
             WHERE eh.user_id IN (SELECT DISTINCT user_id FROM degrees WHERE title ILIKE $1)
             GROUP BY sector
             ORDER BY count DESC
             LIMIT 10`,
            [param]
          ),
          query(
            `SELECT
               COALESCE(NULLIF(TRIM(eh.role), ''), 'Unknown') AS role,
               COUNT(DISTINCT eh.user_id) AS count
             FROM employment_history eh
             WHERE eh.user_id IN (SELECT DISTINCT user_id FROM degrees WHERE title ILIKE $1)
             GROUP BY role
             ORDER BY count DESC
             LIMIT 10`,
            [param]
          ),
        ]);

        const total = parseInt(totalRes.rows[0]?.total ?? "0", 10);
        const toPct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

        res.json({
          programme,
          total_alumni: total,
          sectors: sectorsRes.rows.map((r) => ({
            sector: r.sector as string,
            count:  parseInt(r.count, 10),
            pct:    toPct(parseInt(r.count, 10)),
          })),
          roles: rolesRes.rows.map((r) => ({
            role:  r.role as string,
            count: parseInt(r.count, 10),
            pct:   toPct(parseInt(r.count, 10)),
          })),
        });
      } else {
        const result = await query(
          `SELECT
             d.title AS programme,
             COUNT(DISTINCT d.user_id) AS total_alumni,
             (SELECT COALESCE(NULLIF(TRIM(eh.industry_sector),''),'Unknown')
              FROM employment_history eh
              WHERE eh.user_id IN (SELECT user_id FROM degrees WHERE title = d.title)
              GROUP BY eh.industry_sector ORDER BY COUNT(*) DESC LIMIT 1) AS top_sector,
             (SELECT COALESCE(NULLIF(TRIM(eh.role),''),'Unknown')
              FROM employment_history eh
              WHERE eh.user_id IN (SELECT user_id FROM degrees WHERE title = d.title)
              GROUP BY eh.role ORDER BY COUNT(*) DESC LIMIT 1) AS top_role
           FROM degrees d
           GROUP BY d.title
           ORDER BY total_alumni DESC`,
          []
        );
        res.json(result.rows.map((r) => ({
          programme:    r.programme    as string,
          total_alumni: parseInt(r.total_alumni, 10),
          top_sector:   r.top_sector  as string | null,
          top_role:     r.top_role    as string | null,
        })));
      }
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/analytics/certification-growth
 *
 * Scenario 3 — Industry Demand Tracking.
 * Compares certification + professional_course counts for five predefined skill
 * categories between the current 6 months and the previous 6 months.
 * Returns growth_pct per category.
 */
router.get(
  "/analytics/certification-growth",
  requireApiKey,
  requirePermission("read:analytics"),
  async (_req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = [
        { name: "Cloud Computing",    keywords: ["AWS","Azure","GCP","Cloud"],                 pattern: "%(aws|azure|gcp|cloud)%" },
        { name: "Agile & Scrum",      keywords: ["Agile","Scrum","Kanban"],                    pattern: "%(agile|scrum|kanban)%" },
        { name: "DevOps & Containers",keywords: ["Docker","Kubernetes","DevOps","Terraform"],  pattern: "%(docker|kubernetes|devops|terraform|jenkins|ansible)%" },
        { name: "Data & Analytics",   keywords: ["Python","Tableau","Data Science","ML"],      pattern: "%(python|tableau|data science|machine learning|spark|databricks)%" },
        { name: "Cybersecurity",      keywords: ["Security","CISSP","CEH","CompTIA"],          pattern: "%(security|cissp|ceh|comptia|cyber|penetration)%" },
      ];

      const results = await Promise.all(
        categories.map(async (cat) => {
          const r = await query(
            `SELECT
               COUNT(*) FILTER (
                 WHERE COALESCE(completed_at, CURRENT_DATE) >= NOW() - INTERVAL '6 months'
               ) AS current_count,
               COUNT(*) FILTER (
                 WHERE COALESCE(completed_at, CURRENT_DATE) >= NOW() - INTERVAL '12 months'
                   AND COALESCE(completed_at, CURRENT_DATE) <  NOW() - INTERVAL '6 months'
               ) AS previous_count
             FROM (
               SELECT title, completed_at FROM certifications
               UNION ALL
               SELECT title, completed_at FROM professional_courses
             ) AS combined
             WHERE LOWER(title) SIMILAR TO $1`,
            [cat.pattern]
          );

          const current  = parseInt(r.rows[0]?.current_count  ?? "0", 10);
          const previous = parseInt(r.rows[0]?.previous_count ?? "0", 10);
          const growth_pct = previous === 0
            ? (current > 0 ? 100 : 0)
            : Math.round(((current - previous) / previous) * 100);

          return {
            category:       cat.name,
            keywords:       cat.keywords,
            current_count:  current,
            previous_count: previous,
            growth_pct,
          };
        })
      );

      res.json(results.sort((a, b) => b.current_count - a.current_count));
    } catch (err) {
      next(err);
    }
  }
);

export default router;
