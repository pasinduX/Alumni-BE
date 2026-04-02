"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.verifyEmail = verifyEmail;
exports.login = login;
exports.logout = logout;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../config/db");
const mailer_1 = require("../config/mailer");
const config_1 = require("../config");
const SALT_ROUNDS = 12;
async function register(req, res, next) {
    try {
        const { email, password } = req.body;
        const domain = config_1.config.allowedDomain;
        if (!email.endsWith(`@${domain}`)) {
            return res.status(400).json({ error: `Email must end with @${domain}` });
        }
        const existing = await (0, db_1.query)("SELECT id FROM users WHERE email = $1", [email]);
        if ((existing.rowCount ?? 0) > 0) {
            return res.status(409).json({ error: "Email already in use" });
        }
        const passwordHash = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const result = await (0, db_1.query)("INSERT INTO users (email, password_hash, email_verification_token, token_expires_at, is_verified, role) VALUES ($1,$2,$3,$4,false,'alumni') RETURNING id", [email, passwordHash, token, expires]);
        const verifyUrl = `${req.protocol}://${req.get("host")}/auth/verify-email?token=${token}`;
        await (0, mailer_1.sendEmail)(email, "Verify your email", `Click here to verify: ${verifyUrl}`, `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`);
        return res.status(201).json({ message: "Verification email sent" });
    }
    catch (err) {
        next(err);
    }
}
async function verifyEmail(req, res, next) {
    try {
        const token = req.query.token;
        if (!token) {
            return res.status(400).json({ error: "Token required" });
        }
        const r = await (0, db_1.query)("SELECT id, token_expires_at FROM users WHERE email_verification_token = $1", [token]);
        if (r.rowCount === 0) {
            return res.status(404).json({ error: "Invalid token" });
        }
        const row = r.rows[0];
        if (new Date(row.token_expires_at) < new Date()) {
            return res.status(400).json({ error: "Token expired" });
        }
        await (0, db_1.query)("UPDATE users SET is_verified = true, email_verification_token = NULL, token_expires_at = NULL WHERE id = $1", [row.id]);
        return res.status(200).json({ message: "Email verified" });
    }
    catch (err) {
        next(err);
    }
}
async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        const r = await (0, db_1.query)("SELECT id, password_hash, is_verified, role FROM users WHERE email = $1", [email]);
        if (r.rowCount === 0 || !r.rows[0].is_verified) {
            return res.status(401).json({ error: "Invalid credentials or unverified" });
        }
        const user = r.rows[0];
        const match = await bcrypt_1.default.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const session = req.session;
        session.userId = user.id;
        session.role = user.role;
        return res.status(200).json({ message: "Logged in" });
    }
    catch (err) {
        next(err);
    }
}
async function logout(req, res, next) {
    try {
        req.session.destroy((err) => {
            if (err) {
                return next(err);
            }
            return res.status(200).json({ message: "Logged out" });
        });
    }
    catch (err) {
        next(err);
    }
}
async function forgotPassword(req, res, next) {
    try {
        const { email } = req.body;
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 60 * 60 * 1000);
        await (0, db_1.query)("UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3", [token, expires, email]);
        const resetUrl = `${req.protocol}://${req.get("host")}/auth/reset-password?token=${token}`;
        await (0, mailer_1.sendEmail)(email, "Reset your password", `Use this link to reset your password: ${resetUrl}`, `<p>Use this <a href="${resetUrl}">link</a> to reset your password.</p>`);
        return res.status(200).json({ message: "If that email exists, reset instructions have been sent" });
    }
    catch (err) {
        next(err);
    }
}
async function resetPassword(req, res, next) {
    try {
        const { token, newPassword } = req.body;
        const r = await (0, db_1.query)("SELECT id, reset_token_expires FROM users WHERE reset_token = $1", [token]);
        if (r.rowCount === 0) {
            return res.status(400).json({ error: "Invalid token" });
        }
        const row = r.rows[0];
        if (new Date(row.reset_token_expires) < new Date()) {
            return res.status(400).json({ error: "Token expired" });
        }
        const passwordHash = await bcrypt_1.default.hash(newPassword, SALT_ROUNDS);
        await (0, db_1.query)("UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2", [passwordHash, row.id]);
        return res.status(200).json({ message: "Password reset successful" });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=authController.js.map