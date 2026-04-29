import { Router, Response, NextFunction } from "express";
import { query } from "../../config/db";
import { requireApiKey, ApiKeyRequest } from "../../middleware/requireApiKey";
import { requirePermission } from "../../middleware/requirePermission";

const router = Router();

// ── Shared helper ─────────────────────────────────────────────────────────────

/**
 * Builds a `WHERE user_id IN (SELECT ...)` cohort subquery from optional
 * programme and graduation_year filters.  Returns the subquery string and its
 * bound params.  If neither filter is given, returns null for the subquery so
 * callers can omit the WHERE clause entirely.
 */
function buildCohortFilter(
  programme?: string,
  graduationYear?: string
): { subquery: string | null; params: (string | number)[] } {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (programme) {
    params.push(`%${programme}%`);
    conditions.push(`title ILIKE $${params.length}`);
  }
  if (graduationYear) {
    const yr = parseInt(graduationYear, 10);
    if (!isNaN(yr)) {
      params.push(yr);
      conditions.push(`EXTRACT(YEAR FROM completed_at) = $${params.length}`);
    }
  }

  if (conditions.length === 0) return { subquery: null, params: [] };

  return {
    subquery: `SELECT DISTINCT user_id FROM degrees WHERE ${conditions.join(" AND ")}`,
    params,
  };
}

// ── GET /api/analytics/skills-gap ─────────────────────────────────────────────

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

// ── GET /api/analytics/employment-by-sector ───────────────────────────────────

router.get(
  "/analytics/employment-by-sector",
  requireApiKey,
  requirePermission("read:analytics"),
  async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { subquery, params } = buildCohortFilter(
        req.query.programme    as string | undefined,
        req.query.graduation_year as string | undefined
      );

      const whereClause = subquery ? `WHERE user_id IN (${subquery})` : "";

      const result = await query(
        `SELECT
           COALESCE(NULLIF(TRIM(industry_sector), ''), 'Unknown') AS sector,
           COUNT(*) AS count
         FROM employment_history
         ${whereClause}
         GROUP BY COALESCE(NULLIF(TRIM(industry_sector), ''), 'Unknown')
         ORDER BY count DESC`,
        params
      );

      res.json(
        result.rows.map((row) => ({
          sector: row.sector as string,
          count:  parseInt(row.count, 10),
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/analytics/job-titles ─────────────────────────────────────────────

router.get(
  "/analytics/job-titles",
  requireApiKey,
  requirePermission("read:analytics"),
  async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { subquery, params } = buildCohortFilter(
        req.query.programme    as string | undefined,
        req.query.graduation_year as string | undefined
      );

      const whereClause = subquery ? `WHERE user_id IN (${subquery})` : "";

      const result = await query(
        `SELECT
           COALESCE(NULLIF(TRIM(role), ''), 'Unknown') AS role,
           COUNT(*) AS count
         FROM employment_history
         ${whereClause}
         GROUP BY role
         ORDER BY count DESC
         LIMIT 15`,
        params
      );

      res.json(
        result.rows.map((row) => ({
          role:  row.role as string,
          count: parseInt(row.count, 10),
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/analytics/top-employers ──────────────────────────────────────────

router.get(
  "/analytics/top-employers",
  requireApiKey,
  requirePermission("read:analytics"),
  async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { subquery, params } = buildCohortFilter(
        req.query.programme    as string | undefined,
        req.query.graduation_year as string | undefined
      );

      const whereClause = subquery ? `WHERE user_id IN (${subquery})` : "";

      const result = await query(
        `SELECT
           COALESCE(NULLIF(TRIM(company), ''), 'Unknown') AS company,
           COUNT(*) AS count
         FROM employment_history
         ${whereClause}
         GROUP BY company
         ORDER BY count DESC
         LIMIT 10`,
        params
      );

      res.json(
        result.rows.map((row) => ({
          company: row.company as string,
          count:   parseInt(row.count, 10),
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/analytics/certification-trends ───────────────────────────────────

router.get(
  "/analytics/certification-trends",
  requireApiKey,
  requirePermission("read:analytics"),
  async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { subquery, params } = buildCohortFilter(
        req.query.programme    as string | undefined,
        req.query.graduation_year as string | undefined
      );

      const userWhere = subquery ? `AND user_id IN (${subquery})` : "";

      const result = await query(
        `SELECT
           TO_CHAR(COALESCE(completed_at, CURRENT_DATE), 'YYYY-MM') AS month,
           COUNT(*) AS count
         FROM certifications
         WHERE COALESCE(completed_at, CURRENT_DATE) >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
           AND COALESCE(completed_at, CURRENT_DATE) <  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
           ${userWhere}
         GROUP BY month
         ORDER BY month ASC`,
        params
      );

      res.json(
        result.rows.map((row) => ({
          month: row.month as string,
          count: parseInt(row.count, 10),
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/analytics/geographic-distribution ────────────────────────────────

router.get(
  "/analytics/geographic-distribution",
  requireApiKey,
  requirePermission("read:analytics"),
  async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { subquery, params } = buildCohortFilter(
        req.query.programme    as string | undefined,
        req.query.graduation_year as string | undefined
      );

      const cohortWhere = subquery ? `AND user_id IN (${subquery})` : "";

      const result = await query(
        `SELECT
           COALESCE(NULLIF(TRIM(location), ''), 'Unknown') AS location,
           COUNT(DISTINCT user_id) AS count
         FROM employment_history
         WHERE location IS NOT NULL AND TRIM(location) <> ''
           ${cohortWhere}
         GROUP BY location
         ORDER BY count DESC`,
        params
      );

      res.json(
        result.rows.map((row) => ({
          location: row.location as string,
          count:    parseInt(row.count, 10),
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/analytics/usage-stats ────────────────────────────────────────────

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

      res.json(
        result.rows.map((row) => ({
          client_name:      row.client_name as string,
          total_calls:      parseInt(row.total_calls, 10),
          last_accessed:    row.last_accessed as string | null,
          unique_endpoints: parseInt(row.unique_endpoints, 10),
        }))
      );
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/analytics/programme-list ─────────────────────────────────────────

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

// ── GET /api/analytics/graduation-years ───────────────────────────────────────

router.get(
  "/analytics/graduation-years",
  requireApiKey,
  requirePermission("read:analytics"),
  async (_req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await query(
        `SELECT DISTINCT EXTRACT(YEAR FROM completed_at)::int AS year
         FROM degrees
         WHERE completed_at IS NOT NULL
         ORDER BY year DESC`,
        []
      );
      res.json(result.rows.map((r) => r.year as number));
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/analytics/career-pathways ────────────────────────────────────────

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
        res.json(
          result.rows.map((r) => ({
            programme:    r.programme    as string,
            total_alumni: parseInt(r.total_alumni, 10),
            top_sector:   r.top_sector  as string | null,
            top_role:     r.top_role    as string | null,
          }))
        );
      }
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/analytics/certification-growth ───────────────────────────────────

router.get(
  "/analytics/certification-growth",
  requireApiKey,
  requirePermission("read:analytics"),
  async (_req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = [
        { name: "Cloud Computing",     keywords: ["AWS","Azure","GCP","Cloud"],                pattern: "%(aws|azure|gcp|cloud)%" },
        { name: "Agile & Scrum",       keywords: ["Agile","Scrum","Kanban"],                   pattern: "%(agile|scrum|kanban)%" },
        { name: "DevOps & Containers", keywords: ["Docker","Kubernetes","DevOps","Terraform"], pattern: "%(docker|kubernetes|devops|terraform|jenkins|ansible)%" },
        { name: "Data & Analytics",    keywords: ["Python","Tableau","Data Science","ML"],     pattern: "%(python|tableau|data science|machine learning|spark|databricks)%" },
        { name: "Cybersecurity",       keywords: ["Security","CISSP","CEH","CompTIA"],         pattern: "%(security|cissp|ceh|comptia|cyber|penetration)%" },
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
