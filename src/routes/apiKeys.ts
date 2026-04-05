import { Router } from "express";
import { body } from "express-validator";
import {
  generateKey,
  listKeys,
  keyStats,
  revokeKey,
} from "../controllers/apiKeysController";
import { requireLogin } from "../middleware/auth";
import { handleValidationErrors } from "../middleware/validate";

const router = Router();

/**
 * @openapi
 * /developer/keys/generate:
 *   post:
 *     summary: Generate a new API key
 *     description: Creates a new developer API key. The plain-text key is returned once and never stored — save it immediately.
 *     security:
 *       - sessionAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label]
 *             properties:
 *               label:
 *                 type: string
 *                 example: "AR App Production"
 *     responses:
 *       201:
 *         description: Key created — plain-text key returned once only
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 key:
 *                   type: string
 *                   example: "ak_a1b2c3..."
 *                 id:
 *                   type: string
 *                 label:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 */
router.post("/developer/keys/generate", requireLogin, body("label").notEmpty(), handleValidationErrors, generateKey);

/**
 * @openapi
 * /developer/keys:
 *   get:
 *     summary: List all API keys for current user
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Array of API key records (hashes never returned)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 keys:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       label:
 *                         type: string
 *                       is_revoked:
 *                         type: boolean
 *                       usage_count:
 *                         type: integer
 *                       last_used_at:
 *                         type: string
 *                         format: date-time
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get("/developer/keys", requireLogin, listKeys);

/**
 * @openapi
 * /developer/keys/{id}/stats:
 *   get:
 *     summary: Get usage stats and recent access logs for an API key
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Key stats with last 20 access log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 usage_count:
 *                   type: integer
 *                 last_used_at:
 *                   type: string
 *                   format: date-time
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       endpoint:
 *                         type: string
 *                       accessed_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: API key not found
 */
router.get("/developer/keys/:id/stats", requireLogin, keyStats);

/**
 * @openapi
 * /developer/keys/{id}/revoke:
 *   delete:
 *     summary: Revoke an API key
 *     security:
 *       - sessionAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Key revoked
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: API key not found
 */
router.delete("/developer/keys/:id/revoke", requireLogin, revokeKey);

export default router;
