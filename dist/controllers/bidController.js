"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeBid = placeBid;
exports.updateBid = updateBid;
exports.cancelBid = cancelBid;
exports.statusBid = statusBid;
exports.historyBid = historyBid;
exports.tomorrowSlot = tomorrowSlot;
exports.monthlyLimit = monthlyLimit;
const db_1 = require("../config/db");
const ITEM = "bids";
const getTomorrowDate = () => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
};
async function placeBid(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const amount = Number(req.body.amount);
        if (!amount || amount <= 0)
            return res.status(400).json({ error: "Amount must be > 0" });
        const winnerProfile = await (0, db_1.query)("SELECT monthly_win_count, attended_event_this_month FROM alumni_profiles WHERE user_id = $1", [userId]);
        if (winnerProfile.rowCount === 0) {
            return res.status(404).json({ error: "Profile required" });
        }
        const profile = winnerProfile.rows[0];
        const baseLimit = 3;
        const limit = profile.attended_event_this_month ? 4 : 3;
        if (profile.monthly_win_count >= limit) {
            return res.status(403).json({ error: "Monthly win limit reached" });
        }
        const bidDate = getTomorrowDate();
        const existing = await (0, db_1.query)("SELECT id FROM bids WHERE user_id = $1 AND bid_date = $2 AND status = 'active'", [userId, bidDate]);
        if ((existing.rowCount ?? 0) > 0)
            return res.status(400).json({ error: "Already bid for tomorrow" });
        await (0, db_1.query)("INSERT INTO bids(user_id, bid_date, amount, status) VALUES ($1,$2,$3,'active')", [userId, bidDate, amount]);
        return res.status(201).json({ message: "Bid placed", bid_date: bidDate });
    }
    catch (err) {
        next(err);
    }
}
async function updateBid(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const amount = Number(req.body.amount);
        if (!amount || amount <= 0)
            return res.status(400).json({ error: "Amount must be > 0" });
        const bidDate = getTomorrowDate();
        const current = await (0, db_1.query)("SELECT id, amount FROM bids WHERE user_id = $1 AND bid_date = $2 AND status = 'active'", [userId, bidDate]);
        if (current.rowCount === 0)
            return res.status(404).json({ error: "Active bid not found" });
        const currentAmount = Number(current.rows[0].amount);
        if (amount <= currentAmount)
            return res.status(400).json({ error: "Amount must be greater than current" });
        await (0, db_1.query)("UPDATE bids SET amount = $1, updated_at = NOW() WHERE id = $2", [amount, current.rows[0].id]);
        return res.status(200).json({ message: "Bid updated" });
    }
    catch (err) {
        next(err);
    }
}
async function cancelBid(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const bidDate = getTomorrowDate();
        const current = await (0, db_1.query)("UPDATE bids SET status = 'cancelled', updated_at = NOW() WHERE user_id = $1 AND bid_date = $2 AND status = 'active' RETURNING *", [userId, bidDate]);
        if (current.rowCount === 0)
            return res.status(404).json({ error: "Active bid not found" });
        return res.status(200).json({ message: "Bid cancelled" });
    }
    catch (err) {
        next(err);
    }
}
async function statusBid(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const bidDate = getTomorrowDate();
        const yourBid = await (0, db_1.query)("SELECT amount FROM bids WHERE user_id = $1 AND bid_date = $2", [userId, bidDate]);
        if (yourBid.rowCount === 0)
            return res.json({ your_bid: null, status: "no_bid" });
        const top = await (0, db_1.query)("SELECT user_id FROM bids WHERE bid_date = $1 AND status = 'active' ORDER BY amount DESC, placed_at ASC LIMIT 1", [bidDate]);
        const status = (top.rowCount ?? 0) > 0 && top.rows[0].user_id === userId ? "winning" : "losing";
        return res.json({ your_bid: Number(yourBid.rows[0].amount), status });
    }
    catch (err) {
        next(err);
    }
}
async function historyBid(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const rows = await (0, db_1.query)("SELECT id,bid_date,amount,status,placed_at,updated_at FROM bids WHERE user_id = $1 ORDER BY bid_date DESC", [userId]);
        return res.json({ bids: rows.rows });
    }
    catch (err) {
        next(err);
    }
}
async function tomorrowSlot(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const bidDate = getTomorrowDate();
        const yourBid = await (0, db_1.query)("SELECT amount FROM bids WHERE user_id = $1 AND bid_date = $2", [userId, bidDate]);
        const top = await (0, db_1.query)("SELECT user_id FROM bids WHERE bid_date = $1 AND status = 'active' ORDER BY amount DESC, placed_at ASC LIMIT 1", [bidDate]);
        const status = (yourBid.rowCount ?? 0) === 0 ? "no_bid" : (top.rowCount ?? 0) > 0 && top.rows[0].user_id === userId ? "winning" : "losing";
        return res.json({
            date: bidDate,
            has_bid: (yourBid.rowCount ?? 0) > 0,
            your_bid: (yourBid.rowCount ?? 0) ? Number(yourBid.rows[0].amount) : null,
            status,
        });
    }
    catch (err) {
        next(err);
    }
}
async function monthlyLimit(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const profile = await (0, db_1.query)("SELECT monthly_win_count, attended_event_this_month FROM alumni_profiles WHERE user_id = $1", [userId]);
        if (profile.rowCount === 0)
            return res.status(404).json({ error: "Profile not found" });
        const wins = profile.rows[0].monthly_win_count;
        const limit = profile.rows[0].attended_event_this_month ? 4 : 3;
        return res.json({ wins_this_month: wins, limit, remaining_slots: Math.max(limit - wins, 0) });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=bidController.js.map