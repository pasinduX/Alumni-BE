
import { query } from "../config/db";

export async function findByEmail(email: string) {
  const r = await query("SELECT id FROM users WHERE email = $1", [email]);
  return r.rows[0] ?? null;
}

export async function findByEmailWithAuth(email: string) {
  const r = await query(
    "SELECT id, password_hash, is_verified, role FROM users WHERE email = $1",
    [email],
  );
  return r.rows[0] ?? null;
}
export async function createUser(
  email: string,
  passwordHash: string,
  verificationToken: string,
  tokenExpiresAt: Date,
  role: string = "alumni",
) {
  await query(
    `INSERT INTO users
       (email, password_hash, email_verification_token, token_expires_at, is_verified, role)
     VALUES ($1, $2, $3, $4, false, $5)`,
    [email, passwordHash, verificationToken, tokenExpiresAt, role],
  );
}

export async function findByVerificationToken(token: string) {
  const r = await query(
    "SELECT id, token_expires_at, role FROM users WHERE email_verification_token = $1",
    [token],
  );
  return r.rows[0] ?? null;
}

export async function markEmailVerified(id: string) {
  await query(
    `UPDATE users
     SET is_verified = true, email_verification_token = NULL, token_expires_at = NULL
     WHERE id = $1`,
    [id],
  );
}

export async function setResetToken(email: string, token: string, expiresAt: Date) {
  await query(
    "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3",
    [token, expiresAt, email],
  );
}

export async function findByResetToken(token: string) {
  const r = await query(
    "SELECT id, reset_token_expires FROM users WHERE reset_token = $1",
    [token],
  );
  return r.rows[0] ?? null;
}

export async function updatePassword(id: string, passwordHash: string) {
  await query(
    `UPDATE users
     SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL
     WHERE id = $2`,
    [passwordHash, id],
  );
}
