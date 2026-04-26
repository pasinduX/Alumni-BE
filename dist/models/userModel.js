"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findByEmail = findByEmail;
exports.findByEmailWithAuth = findByEmailWithAuth;
exports.createUser = createUser;
exports.findByVerificationToken = findByVerificationToken;
exports.markEmailVerified = markEmailVerified;
exports.setResetToken = setResetToken;
exports.findByResetToken = findByResetToken;
exports.updatePassword = updatePassword;
const db_1 = require("../config/db");
async function findByEmail(email) {
    const r = await (0, db_1.query)("SELECT id FROM users WHERE email = $1", [email]);
    return r.rows[0] ?? null;
}
async function findByEmailWithAuth(email) {
    const r = await (0, db_1.query)("SELECT id, password_hash, is_verified, role FROM users WHERE email = $1", [email]);
    return r.rows[0] ?? null;
}
async function createUser(email, passwordHash, verificationToken, tokenExpiresAt, role = "alumni") {
    await (0, db_1.query)(`INSERT INTO users
       (email, password_hash, email_verification_token, token_expires_at, is_verified, role)
     VALUES ($1, $2, $3, $4, false, $5)`, [email, passwordHash, verificationToken, tokenExpiresAt, role]);
}
async function findByVerificationToken(token) {
    const r = await (0, db_1.query)("SELECT id, token_expires_at, role FROM users WHERE email_verification_token = $1", [token]);
    return r.rows[0] ?? null;
}
async function markEmailVerified(id) {
    await (0, db_1.query)(`UPDATE users
     SET is_verified = true, email_verification_token = NULL, token_expires_at = NULL
     WHERE id = $1`, [id]);
}
async function setResetToken(email, token, expiresAt) {
    await (0, db_1.query)("UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3", [token, expiresAt, email]);
}
async function findByResetToken(token) {
    const r = await (0, db_1.query)("SELECT id, reset_token_expires FROM users WHERE reset_token = $1", [token]);
    return r.rows[0] ?? null;
}
async function updatePassword(id, passwordHash) {
    await (0, db_1.query)(`UPDATE users
     SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL
     WHERE id = $2`, [passwordHash, id]);
}
//# sourceMappingURL=userModel.js.map