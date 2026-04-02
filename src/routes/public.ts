import { Router } from "express";
import { getAlumniOfTheDay } from "../controllers/publicController";
import { apiKeyAuth } from "../middleware/apiKeyAuth";

const router = Router();

/**
 * @openapi
 * /api/v1/alumni-of-the-day:
 *   get:
 *     summary: Get today's alumni of the day
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Alumni profile
 *       401:
 *         description: Invalid or revoked API key
 */
router.get("/api/v1/alumni-of-the-day", apiKeyAuth, getAlumniOfTheDay);

export default router;
