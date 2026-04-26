"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bidController_1 = require("../controllers/bidController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /bidding/place:
 *   post:
 *     summary: Place a bid for a slot
 *     security:
 *       - sessionAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Bid placed
 */
router.post("/bidding/place", auth_1.requireLogin, (0, express_validator_1.body)("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"), validate_1.handleValidationErrors, bidController_1.placeBid);
/**
 * @openapi
 * /bidding/update:
 *   put:
 *     summary: Update existing bid
 *     security:
 *       - sessionAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Bid updated
 */
router.put("/bidding/update", auth_1.requireLogin, (0, express_validator_1.body)("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"), validate_1.handleValidationErrors, bidController_1.updateBid);
/**
 * @openapi
 * /bidding/cancel:
 *   delete:
 *     summary: Cancel an existing bid
 *     security:
 *       - sessionAuth: []
 *         csrfToken: []
 *     responses:
 *       204:
 *         description: Bid canceled
 */
router.delete("/bidding/cancel", auth_1.requireLogin, bidController_1.cancelBid);
/**
 * @openapi
 * /bidding/status:
 *   get:
 *     summary: Get current bidding status
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Status details
 */
router.get("/bidding/status", auth_1.requireLogin, bidController_1.statusBid);
/**
 * @openapi
 * /bidding/history:
 *   get:
 *     summary: Get user's bid history
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: History list
 */
router.get("/bidding/history", auth_1.requireLogin, bidController_1.historyBid);
/**
 * @openapi
 * /bidding/tomorrow-slot:
 *   get:
 *     summary: Get tomorrow's bidding slot information
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Slot details
 */
router.get("/bidding/tomorrow-slot", auth_1.requireLogin, bidController_1.tomorrowSlot);
/**
 * @openapi
 * /bidding/monthly-limit:
 *   get:
 *     summary: Get monthly bidding limit for current user
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Limit data
 */
router.get("/bidding/monthly-limit", auth_1.requireLogin, bidController_1.monthlyLimit);
exports.default = router;
//# sourceMappingURL=bids.js.map