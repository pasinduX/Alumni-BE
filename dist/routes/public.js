"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const publicController_1 = require("../controllers/publicController");
const apiKeyAuth_1 = require("../middleware/apiKeyAuth");
const router = (0, express_1.Router)();
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
router.get("/api/v1/alumni-of-the-day", apiKeyAuth_1.apiKeyAuth, publicController_1.getAlumniOfTheDay);
exports.default = router;
//# sourceMappingURL=public.js.map