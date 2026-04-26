"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.verifyEmailToken = verifyEmailToken;
exports.authenticateUser = authenticateUser;
exports.requestPasswordReset = requestPasswordReset;
exports.resetUserPassword = resetUserPassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
const mailService_1 = require("./mailService");
const AppError_1 = require("../utils/AppError");
const userModel = __importStar(require("../models/userModel"));
const SALT_ROUNDS = 12;
async function registerUser(email, password, baseUrl, role = "alumni") {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith(`@${config_1.config.allowedDomain}`)) {
        throw new AppError_1.AppError(400, `Email must end with @${config_1.config.allowedDomain}`, "INVALID_DOMAIN");
    }
    if (!["alumni", "university_staff"].includes(role)) {
        throw new AppError_1.AppError(400, "Invalid role", "INVALID_ROLE");
    }
    const existing = await userModel.findByEmail(normalizedEmail);
    if (existing) {
        throw new AppError_1.AppError(409, "Email already in use", "EMAIL_EXISTS");
    }
    const passwordHash = await bcrypt_1.default.hash(password, SALT_ROUNDS);
    const token = crypto_1.default.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await userModel.createUser(normalizedEmail, passwordHash, token, expires, role);
    const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;
    await (0, mailService_1.sendEmail)(email, "Verify your email", `Click here to verify: ${verifyUrl}`, `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`);
}
async function verifyEmailToken(token) {
    const user = await userModel.findByVerificationToken(token);
    if (!user)
        throw new AppError_1.AppError(400, "Invalid verification token", "INVALID_TOKEN");
    if (new Date(user.token_expires_at) < new Date()) {
        throw new AppError_1.AppError(400, "Verification token has expired", "TOKEN_EXPIRED");
    }
    await userModel.markEmailVerified(user.id);
    return user.role;
}
async function authenticateUser(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userModel.findByEmailWithAuth(normalizedEmail);
    if (!user || !user.is_verified)
        return null;
    const match = await bcrypt_1.default.compare(password, user.password_hash);
    if (!match)
        return null;
    return { id: user.id, role: user.role };
}
async function requestPasswordReset(email, baseUrl) {
    const token = crypto_1.default.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await userModel.setResetToken(email, token, expires);
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;
    await (0, mailService_1.sendEmail)(email, "Reset your password", `Use this link to reset your password: ${resetUrl}`, `<p>Use this <a href="${resetUrl}">link</a> to reset your password.</p>`);
}
async function resetUserPassword(token, newPassword) {
    const row = await userModel.findByResetToken(token);
    if (!row)
        throw new AppError_1.AppError(400, "Invalid reset token", "INVALID_TOKEN");
    if (new Date(row.reset_token_expires) < new Date()) {
        throw new AppError_1.AppError(400, "Reset token has expired", "TOKEN_EXPIRED");
    }
    const passwordHash = await bcrypt_1.default.hash(newPassword, SALT_ROUNDS);
    await userModel.updatePassword(row.id, passwordHash);
}
//# sourceMappingURL=authService.js.map