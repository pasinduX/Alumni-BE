/**
 * userModel — raw SQL query functions for the `users` table.
 * No business logic. Each function maps to exactly one SQL operation.
 */
import { query } from "../config/db";

/** Returns the user id row if the email exists, otherwise null. */
export async function findByEmail(email: string) {
  const r = await query("SELECT id FROM users WHERE email = $1", [email]);
  return r.rows[0] ?? null;
}

/** Returns the full auth row needed to verify credentials and build a session. */
export async function findByEmailWithAuth(email: string) {
  const r = await query(
    "SELECT id, password_hash, is_verified, role FROM users WHERE email = $1",
    [email],
  );
  return r.rows[0] ?? null;
}

/** Inserts a new unverified user row. */
export async function createUser(
  email: string,
  passwordHash: string,
  verificationToken: string,
  tokenExpiresAt: Date,
) {
  await query(
    `INSERT INTO users
       (email, password_hash, email_verification_token, token_expires_at, is_verified, role)
     VALUES ($1, $2, $3, $4, false, 'alumni')`,
    [email, passwordHash, verificationToken, tokenExpiresAt],
  );
}

/** Looks up a user by their pending e-mail verification token. */
export async function findByVerificationToken(token: string) {
  const r = await query(
    "SELECT id, token_expires_at FROM users WHERE email_verification_token = $1",
    [token],
  );
  return r.rows[0] ?? null;
}

/** Marks the user verified and clears the verification token. */
export async function markEmailVerified(id: string) {
  await query(
    `UPDATE users
     SET is_verified = true, email_verification_token = NULL, token_expires_at = NULL
     WHERE id = $1`,
    [id],
  );
}

/** Writes a password-reset token + expiry for the given email address. */
export async function setResetToken(email: string, token: string, expiresAt: Date) {
  await query(
    "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3",
    [token, expiresAt, email],
  );
}

/** Returns the user row that owns the given reset token, or null. */
export async function findByResetToken(token: string) {
  const r = await query(
    "SELECT id, reset_token_expires FROM users WHERE reset_token = $1",
    [token],
  );
  return r.rows[0] ?? null;
}

/** Replaces the password hash and clears the reset token. */
export async function updatePassword(id: string, passwordHash: string) {
  await query(
    `UPDATE users
     SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL
     WHERE id = $2`,
    [passwordHash, id],
  );
}
