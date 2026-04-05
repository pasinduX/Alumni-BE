/**
 * bidModel — raw SQL query functions for the `bids` table and the
 * `monthly_win_count / attended_event_this_month` columns on `alumni_profiles`.
 * No business logic. Each function maps to exactly one SQL operation.
 */
import { query } from "../config/db";

/** Returns the monthly-limits profile slice for the given user. */
export async function findMonthlyProfile(userId: string) {
  const r = await query(
    "SELECT monthly_win_count, attended_event_this_month FROM alumni_profiles WHERE user_id = $1",
    [userId],
  );
  return r.rows[0] ?? null;
}

/** Returns the user's active bid for the given date, or null. */
export async function findActiveBid(userId: string, bidDate: string) {
  const r = await query(
    "SELECT id, amount FROM bids WHERE user_id = $1 AND bid_date = $2 AND status = 'active'",
    [userId, bidDate],
  );
  return r.rows[0] ?? null;
}

/** Inserts a new active bid row. */
export async function createBid(userId: string, bidDate: string, amount: number) {
  await query(
    "INSERT INTO bids (user_id, bid_date, amount, status) VALUES ($1, $2, $3, 'active')",
    [userId, bidDate, amount],
  );
}

/** Updates the amount on an existing bid. */
export async function setBidAmount(bidId: string, amount: number) {
  await query(
    "UPDATE bids SET amount = $1, updated_at = NOW() WHERE id = $2",
    [amount, bidId],
  );
}

/** Cancels the user's active bid for the given date. Returns the cancelled row or null. */
export async function cancelBid(userId: string, bidDate: string) {
  const r = await query(
    `UPDATE bids SET status = 'cancelled', updated_at = NOW()
     WHERE user_id = $1 AND bid_date = $2 AND status = 'active'
     RETURNING *`,
    [userId, bidDate],
  );
  return r.rows[0] ?? null;
}

/** Returns just the amount of a bid for a user on a given date, or null. */
export async function findBidAmount(userId: string, bidDate: string) {
  const r = await query(
    "SELECT amount FROM bids WHERE user_id = $1 AND bid_date = $2",
    [userId, bidDate],
  );
  return r.rows[0] ?? null;
}

/** Returns the user_id of the current top bid for a given date. */
export async function findTopBid(bidDate: string) {
  const r = await query(
    `SELECT user_id FROM bids
     WHERE bid_date = $1 AND status = 'active'
     ORDER BY amount DESC, placed_at ASC
     LIMIT 1`,
    [bidDate],
  );
  return r.rows[0] ?? null;
}

/** Returns the full bid history for a user, newest first. */
export async function findBidHistory(userId: string) {
  const r = await query(
    `SELECT id, bid_date, amount, status, placed_at, updated_at
     FROM bids
     WHERE user_id = $1
     ORDER BY bid_date DESC`,
    [userId],
  );
  return r.rows;
}
