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
  async (_req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await query(
        `SELECT
           title,
           provider,
           COUNT(*) AS count
         FROM (
           SELECT title, provider FROM certifications
           UNION ALL
           SELECT title, provider FROM professional_courses
         ) AS combined
         GROUP BY title, provider
         ORDER BY count DESC
         LIMIT 20`,
        []
      );

      const data = result.rows.map((row) => ({
        title:    row.title    as string,
        provider: row.provider as string | null,
        count:    parseInt(row.count, 10),
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
         GROUP BY sector
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
           TO_CHAR(completed_at, 'YYYY-MM') AS month,
           COUNT(*) AS count
         FROM certifications
         WHERE completed_at >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
           AND completed_at <  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
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

export default router;
