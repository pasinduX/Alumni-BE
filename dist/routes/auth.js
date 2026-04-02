"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const rateLimiter_1 = require("../middleware/rateLimiter");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
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
router.post("/register", rateLimiter_1.authLimiter, (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"), (0, express_validator_1.body)("password")
    .isStrongPassword({ minLength: 8, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
    .withMessage("Password must be minimum 8 chars, include uppercase, number and special char"), (0, express_validator_1.body)("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("confirmPassword must match password"), validate_1.handleValidationErrors, authController_1.register);
router.get("/verify-email", authController_1.verifyEmail);
router.post("/login", rateLimiter_1.authLimiter, (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"), (0, express_validator_1.body)("password").notEmpty().withMessage("Password is required"), validate_1.handleValidationErrors, authController_1.login);
router.post("/logout", authController_1.logout);
router.post("/forgot-password", rateLimiter_1.authLimiter, (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"), validate_1.handleValidationErrors, authController_1.forgotPassword);
router.post("/reset-password", rateLimiter_1.authLimiter, (0, express_validator_1.body)("token").notEmpty().withMessage("Token required"), (0, express_validator_1.body)("newPassword").isStrongPassword({ minLength: 8, minUppercase: 1, minNumbers: 1, minSymbols: 1 }), validate_1.handleValidationErrors, authController_1.resetPassword);
exports.default = router;
//# sourceMappingURL=auth.js.map