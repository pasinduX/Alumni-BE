"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMonthlyProfile = findMonthlyProfile;
exports.findActiveBid = findActiveBid;
exports.createBid = createBid;
exports.setBidAmount = setBidAmount;
exports.cancelBid = cancelBid;
exports.findBidAmount = findBidAmount;
exports.findTopBid = findTopBid;
exports.findBidHistory = findBidHistory;
const db_1 = require("../config/db");
async function findMonthlyProfile(userId) {
    const r = await (0, db_1.query)("SELECT monthly_win_count, attended_event_this_month FROM alumni_profiles WHERE user_id = $1", [userId]);
    return r.rows[0] ?? null;
}
async function findActiveBid(userId, bidDate) {
    const r = await (0, db_1.query)("SELECT id, amount FROM bids WHERE user_id = $1 AND bid_date = $2 AND status = 'active'", [userId, bidDate]);
    return r.rows[0] ?? null;
}
async function createBid(userId, bidDate, amount) {
    await (0, db_1.query)("INSERT INTO bids (user_id, bid_date, amount, status) VALUES ($1, $2, $3, 'active')", [userId, bidDate, amount]);
}
async function setBidAmount(bidId, amount) {
    await (0, db_1.query)("UPDATE bids SET amount = $1, updated_at = NOW() WHERE id = $2", [amount, bidId]);
}
async function cancelBid(userId, bidDate) {
    const r = await (0, db_1.query)(`UPDATE bids SET status = 'cancelled', updated_at = NOW()
     WHERE user_id = $1 AND bid_date = $2 AND status = 'active'
     RETURNING *`, [userId, bidDate]);
    return r.rows[0] ?? null;
}
async function findBidAmount(userId, bidDate) {
    const r = await (0, db_1.query)("SELECT amount FROM bids WHERE user_id = $1 AND bid_date = $2", [userId, bidDate]);
    return r.rows[0] ?? null;
}
async function findTopBid(bidDate) {
    const r = await (0, db_1.query)(`SELECT user_id FROM bids
     WHERE bid_date = $1 AND status = 'active'
     ORDER BY amount DESC, placed_at ASC
     LIMIT 1`, [bidDate]);
    return r.rows[0] ?? null;
}
async function findBidHistory(userId) {
    const r = await (0, db_1.query)(`SELECT id, bid_date, amount, status, placed_at, updated_at
     FROM bids
     WHERE user_id = $1
     ORDER BY bid_date DESC`, [userId]);
    return r.rows;
}
//# sourceMappingURL=bidModel.js.map