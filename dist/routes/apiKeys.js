"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const apiKeysController_1 = require("../controllers/apiKeysController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
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
 *             required: [client_name]
 *             properties:
 *               client_name:
 *                 type: string
 *                 example: "AR App Production"
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["read:alumni_of_day"]
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
 *                 client_name:
 *                   type: string
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 is_active:
 *                   type: boolean
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 */
router.post("/developer/keys/generate", auth_1.requireLogin, (0, express_validator_1.body)("client_name").notEmpty(), (0, express_validator_1.body)("permissions").optional().isArray(), validate_1.handleValidationErrors, apiKeysController_1.generateKey);
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
 *                       client_name:
 *                         type: string
 *                       permissions:
 *                         type: array
 *                         items:
 *                           type: string
 *                       is_active:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get("/developer/keys", auth_1.requireLogin, apiKeysController_1.listKeys);
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
 *                 client_name:
 *                   type: string
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 is_active:
 *                   type: boolean
 *                 created_at:
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
router.get("/developer/keys/:id/stats", auth_1.requireLogin, apiKeysController_1.keyStats);
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
router.delete("/developer/keys/:id/revoke", auth_1.requireLogin, apiKeysController_1.revokeKey);
exports.default = router;
//# sourceMappingURL=apiKeys.js.map