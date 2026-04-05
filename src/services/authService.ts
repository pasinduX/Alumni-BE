import bcrypt from "bcrypt";
import crypto from "crypto";
import { config } from "../config";
import { sendEmail } from "./mailService";
import { AppError } from "../utils/AppError";
import * as userModel from "../models/userModel";

const SALT_ROUNDS = 12;

/**
 * Registers a new user.
 * Throws AppError(400, ..., "INVALID_DOMAIN") or AppError(409, ..., "EMAIL_EXISTS").
 */
export async function registerUser(email: string, password: string, baseUrl: string) {
  if (!email.endsWith(`@${config.allowedDomain}`)) {
    throw new AppError(400, `Email must end with @${config.allowedDomain}`, "INVALID_DOMAIN");
  }

  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw new AppError(409, "Email already in use", "EMAIL_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await userModel.createUser(email, passwordHash, token, expires);

  const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;
  await sendEmail(
    email,
    "Verify your email",
    `Click here to verify: ${verifyUrl}`,
    `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`,
  );
}

/**
 * Verifies an e-mail token and marks the user verified.
 * Throws AppError(400, ..., "INVALID_TOKEN") or AppError(400, ..., "TOKEN_EXPIRED").
 */
export async function verifyEmailToken(token: string) {
  const user = await userModel.findByVerificationToken(token);
  if (!user) throw new AppError(400, "Invalid verification token", "INVALID_TOKEN");
  if (new Date(user.token_expires_at) < new Date()) {
    throw new AppError(400, "Verification token has expired", "TOKEN_EXPIRED");
  }
  await userModel.markEmailVerified(user.id);
}

/**
 * Checks credentials and returns the user id + role, or null for bad credentials.
 */
export async function authenticateUser(email: string, password: string) {
  const user = await userModel.findByEmailWithAuth(email);
  if (!user || !user.is_verified) return null;
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return null;
  return { id: user.id, role: user.role };
}

/**
 * Generates a password-reset token and e-mails it.
 * Silently succeeds even when the email doesn't exist (prevents enumeration).
 */
export async function requestPasswordReset(email: string, baseUrl: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await userModel.setResetToken(email, token, expires);
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;
  await sendEmail(
    email,
    "Reset your password",
    `Use this link to reset your password: ${resetUrl}`,
    `<p>Use this <a href="${resetUrl}">link</a> to reset your password.</p>`,
  );
}

/**
 * Resets a user's password using a reset token.
 * Throws AppError(400, ..., "INVALID_TOKEN") or AppError(400, ..., "TOKEN_EXPIRED").
 */
export async function resetUserPassword(token: string, newPassword: string) {
  const row = await userModel.findByResetToken(token);
  if (!row) throw new AppError(400, "Invalid reset token", "INVALID_TOKEN");
  if (new Date(row.reset_token_expires) < new Date()) {
    throw new AppError(400, "Reset token has expired", "TOKEN_EXPIRED");
  }
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await userModel.updatePassword(row.id, passwordHash);
}
