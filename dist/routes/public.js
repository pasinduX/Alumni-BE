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
 *     summary: Get today's Alumni of the Day (AR app endpoint)
 *     description: Returns the full profile of the alumnus who won today's bidding auction. Used by the AR client to display alumni information to students. Requires a valid developer API key.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Full alumni profile for today's winner
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bid_winner_id:
 *                   type: string
 *                   format: uuid
 *                 display_date:
 *                   type: string
 *                   format: date
 *                   example: "2026-04-03"
 *                 user_id:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
 *                   format: email
 *                 full_name:
 *                   type: string
 *                   example: "Jane Smith"
 *                 bio:
 *                   type: string
 *                 linkedin_url:
 *                   type: string
 *                   example: "https://linkedin.com/in/janesmith"
 *                 phone_number:
 *                   type: string
 *                   example: "07712 345 678"
 *                 profile_image_url:
 *                   type: string
 *                 monthly_win_count:
 *                   type: integer
 *                 attended_event_this_month:
 *                   type: boolean
 *                 degrees:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       institution:
 *                         type: string
 *                       url:
 *                         type: string
 *                       completed_at:
 *                         type: string
 *                         format: date
 *                 certifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       provider:
 *                         type: string
 *                       url:
 *                         type: string
 *                       completed_at:
 *                         type: string
 *                         format: date
 *                 licences:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       awarding_body:
 *                         type: string
 *                       url:
 *                         type: string
 *                       completed_at:
 *                         type: string
 *                         format: date
 *                 professional_courses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       provider:
 *                         type: string
 *                       url:
 *                         type: string
 *                       completed_at:
 *                         type: string
 *                         format: date
 *                 employment_history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       company:
 *                         type: string
 *                       role:
 *                         type: string
 *                       start_date:
 *                         type: string
 *                         format: date
 *                       end_date:
 *                         type: string
 *                         format: date
 *                       is_current:
 *                         type: boolean
 *       401:
 *         description: Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid or revoked API key"
 *       404:
 *         description: No winner selected for today
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No alumni of the day"
 */
router.get("/api/v1/alumni-of-the-day", apiKeyAuth_1.apiKeyAuth, publicController_1.getAlumniOfTheDay);
exports.default = router;
//# sourceMappingURL=public.js.map