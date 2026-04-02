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

router.post("/developer/keys/generate", requireLogin, body("label").notEmpty(), handleValidationErrors, generateKey);
router.get("/developer/keys", requireLogin, listKeys);
router.get("/developer/keys/:id/stats", requireLogin, keyStats);
router.delete("/developer/keys/:id/revoke", requireLogin, revokeKey);

export default router;
