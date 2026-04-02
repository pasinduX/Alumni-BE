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

router.post(
  "/bidding/place",
  requireLogin,
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  handleValidationErrors,
  placeBid,
);

router.put(
  "/bidding/update",
  requireLogin,
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  handleValidationErrors,
  updateBid,
);

router.delete("/bidding/cancel", requireLogin, cancelBid);
router.get("/bidding/status", requireLogin, statusBid);
router.get("/bidding/history", requireLogin, historyBid);
router.get("/bidding/tomorrow-slot", requireLogin, tomorrowSlot);
router.get("/bidding/monthly-limit", requireLogin, monthlyLimit);

export default router;
