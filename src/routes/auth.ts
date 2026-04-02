import { Router } from "express";
import { body } from "express-validator";
import {
  register,
  verifyEmail,
  login,
  logout,
  forgotPassword,
  resetPassword,
} from "../controllers/authController";
import { authLimiter } from "../middleware/rateLimiter";
import { handleValidationErrors } from "../middleware/validate";

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user and send verification email
 *     description: Register alumni accounts for the configured university domain.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email,password,confirmPassword]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       201:
 *         description: Verification email sent
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email exists
 */
router.post(
  "/register",
  authLimiter,
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isStrongPassword({ minLength: 8, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
    .withMessage("Password must be minimum 8 chars, include uppercase, number and special char"),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("confirmPassword must match password"),
  handleValidationErrors,
  register,
);

router.get("/verify-email", verifyEmail);

router.post(
  "/login",
  authLimiter,
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
  login,
);

router.post("/logout", logout);

router.post(
  "/forgot-password",
  authLimiter,
  body("email").isEmail().withMessage("Valid email is required"),
  handleValidationErrors,
  forgotPassword,
);

router.post(
  "/reset-password",
  authLimiter,
  body("token").notEmpty().withMessage("Token required"),
  body("newPassword").isStrongPassword({ minLength: 8, minUppercase: 1, minNumbers: 1, minSymbols: 1 }),
  handleValidationErrors,
  resetPassword,
);

export default router;
