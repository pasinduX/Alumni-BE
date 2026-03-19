import { Router } from "express";
import { body } from "express-validator";
import { requireAuth } from "../middleware/auth";
import { placeBidHandler, getBidStatusHandler } from "../controllers/bidController";

const router = Router();

router.get("/status", requireAuth, getBidStatusHandler);

router.post(
  "/",
  requireAuth,
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  placeBidHandler
);

export default router;
