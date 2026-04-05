import { Router } from "express";
import { body } from "express-validator";
import {
  placeBid,
  updateBid,
  cancelBid,
  statusBid,
  historyBid,
  tomorrowSlot,
  monthlyLimit,
} from "../controllers/bidController";
import { requireLogin } from "../middleware/auth";
import { handleValidationErrors } from "../middleware/validate";

const router = Router();

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
router.post(
  "/bidding/place",
  requireLogin,
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  handleValidationErrors,
  placeBid,
);

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
router.put(
  "/bidding/update",
  requireLogin,
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  handleValidationErrors,
  updateBid,
);

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
router.delete("/bidding/cancel", requireLogin, cancelBid);

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
router.get("/bidding/status", requireLogin, statusBid);

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
router.get("/bidding/history", requireLogin, historyBid);

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
router.get("/bidding/tomorrow-slot", requireLogin, tomorrowSlot);

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
router.get("/bidding/monthly-limit", requireLogin, monthlyLimit);

export default router;
