import bcrypt from "bcrypt";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { query } from "../config/db";
import { sendEmail } from "../config/mailer";
import { config } from "../config";

const SALT_ROUNDS = 12;

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const domain = config.allowedDomain;

    if (!email.endsWith(`@${domain}`)) {
      return res.status(400).json({ error: `Email must end with @${domain}` });
    }

    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if ((existing.rowCount ?? 0) > 0) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await query(
      "INSERT INTO users (email, password_hash, email_verification_token, token_expires_at, is_verified, role) VALUES ($1,$2,$3,$4,false,'alumni') RETURNING id",
      [email, passwordHash, token, expires],
    );

    const verifyUrl = `${req.protocol}://${req.get("host")}/auth/verify-email?token=${token}`;

    await sendEmail(
      email,
      "Verify your email",
      `Click here to verify: ${verifyUrl}`,
      `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`,
    );

    return res.status(201).json({ message: "Verification email sent" });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ error: "Token required" });
    }

    const r = await query("SELECT id, token_expires_at FROM users WHERE email_verification_token = $1", [token]);
    if (r.rowCount === 0) {
      return res.redirect('/web/login?verified=0&error=invalid_token');
    }

    const row = r.rows[0];
    if (new Date(row.token_expires_at) < new Date()) {
      return res.redirect('/web/login?verified=0&error=token_expired');
    }

    await query(
      "UPDATE users SET is_verified = true, email_verification_token = NULL, token_expires_at = NULL WHERE id = $1",
      [row.id],
    );

    return res.redirect('/web/login?verified=1');
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const r = await query("SELECT id, password_hash, is_verified, role FROM users WHERE email = $1", [email]);
    if (r.rowCount === 0 || !r.rows[0].is_verified) {
      return res.status(401).json({ error: "Invalid credentials or unverified" });
    }

    const user = r.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const session = req.session as any;
    session.userId = user.id;
    session.role = user.role;
    session.email = email;
    return res.status(200).json({ message: "Logged in" });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    req.session.destroy((err: any) => {
      if (err) {
        return next(err);
      }
      return res.status(200).json({ message: "Logged out" });
    });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await query(
      "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3",
      [token, expires, email],
    );

    const resetUrl = `${req.protocol}://${req.get("host")}/auth/reset-password?token=${token}`;
    await sendEmail(
      email,
      "Reset your password",
      `Use this link to reset your password: ${resetUrl}`,
      `<p>Use this <a href="${resetUrl}">link</a> to reset your password.</p>`,
    );

    return res.status(200).json({ message: "If that email exists, reset instructions have been sent" });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = req.body;
    const r = await query("SELECT id, reset_token_expires FROM users WHERE reset_token = $1", [token]);
    if (r.rowCount === 0) {
      return res.status(400).json({ error: "Invalid token" });
    }

    const row = r.rows[0];
    if (new Date(row.reset_token_expires) < new Date()) {
      return res.status(400).json({ error: "Token expired" });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await query(
      "UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
      [passwordHash, row.id],
    );

    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    next(err);
  }
}
