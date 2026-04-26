"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const rateLimiter_1 = require("../middleware/rateLimiter");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
router.get("/login", (_req, res) => res.redirect("/web/login"));
router.get("/register", (_req, res) => res.redirect("/web/register"));
router.get("/forgot-password", (_req, res) => res.redirect("/web/forgot-password"));
/**
 * @openapi
 * /auth/csrf-token:
 *   get:
 *     summary: Get current CSRF token (for API clients)
 *     security: []
 *     responses:
 *       200:
 *         description: CSRF token returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 */
router.get("/csrf-token", (req, res) => {
    try {
        const token = req.csrfToken && req.csrfToken();
        if (!token) {
            return res.status(500).json({ error: "CSRF token generation failed" });
        }
        return res.json({ csrfToken: token });
    }
    catch (err) {
        return res.status(500).json({ error: "CSRF token generation failed" });
    }
});
/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user and send verification email
 *     description: Register alumni accounts for the configured university domain.
 *     security:
 *       - csrfToken: []
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
    .withMessage("confirmPassword must match password"), (0, express_validator_1.body)("role")
    .optional()
    .isIn(["alumni", "university_staff"])
    .withMessage("Invalid registration role"), validate_1.handleValidationErrors, authController_1.register);
/**
 * @openapi
 * /auth/verify-email:
 *   get:
 *     summary: Verify user email with token
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to login with message
 *       400:
 *         description: Token required or expired
 *       404:
 *         description: Invalid token
 */
router.get("/verify-email", authController_1.verifyEmail);
/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Authenticate user
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", rateLimiter_1.authLimiter, (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"), (0, express_validator_1.body)("password").notEmpty().withMessage("Password is required"), validate_1.handleValidationErrors, authController_1.login);
/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Log out current user
 *     security:
 *       - sessionAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post("/logout", authController_1.logout);
/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset link
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset instructions sent
 */
router.post("/forgot-password", rateLimiter_1.authLimiter, (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"), validate_1.handleValidationErrors, authController_1.forgotPassword);
/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Token invalid/expired
 */
router.post("/reset-password", rateLimiter_1.authLimiter, (0, express_validator_1.body)("token").notEmpty().withMessage("Token required"), (0, express_validator_1.body)("newPassword").isStrongPassword({ minLength: 8, minUppercase: 1, minNumbers: 1, minSymbols: 1 }), validate_1.handleValidationErrors, authController_1.resetPassword);
exports.default = router;
//# sourceMappingURL=auth.js.map