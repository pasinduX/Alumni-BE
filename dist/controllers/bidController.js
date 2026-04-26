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
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeBid = placeBid;
exports.updateBid = updateBid;
exports.cancelBid = cancelBid;
exports.statusBid = statusBid;
exports.historyBid = historyBid;
exports.tomorrowSlot = tomorrowSlot;
exports.monthlyLimit = monthlyLimit;
const bidService = __importStar(require("../services/bidService"));
async function placeBid(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const amount = Number(req.body.amount);
        if (!amount || amount <= 0)
            return res.status(400).json({ error: "Amount must be > 0" });
        const profile = await bidService.getMonthlyProfile(userId);
        if (!profile)
            return res.status(404).json({ error: "Profile required" });
        const limit = profile.attended_event_this_month ? 4 : 3;
        if (Number(profile.monthly_win_count ?? 0) >= limit) {
            return res.status(403).json({ error: "Monthly win limit reached" });
        }
        const bidDate = bidService.getTomorrowDateString();
        const existing = await bidService.getExistingActiveBid(userId, bidDate);
        if (existing)
            return res.status(400).json({ error: "Already bid for tomorrow" });
        await bidService.insertBid(userId, bidDate, amount);
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
        const bidDate = bidService.getTomorrowDateString();
        const current = await bidService.getExistingActiveBid(userId, bidDate);
        if (!current)
            return res.status(404).json({ error: "Active bid not found" });
        const currentAmount = Number(current.amount);
        if (amount <= currentAmount)
            return res.status(400).json({ error: "Amount must be greater than current" });
        await bidService.updateBidAmount(current.id, amount);
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
        const bidDate = bidService.getTomorrowDateString();
        const cancelled = await bidService.cancelActiveBid(userId, bidDate);
        if (!cancelled)
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
        const status = await bidService.getUserBidStatus(userId);
        return res.json(status);
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
        const bids = await bidService.getBidHistory(userId);
        return res.json({ bids });
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
        const slot = await bidService.getTomorrowSlot(userId);
        return res.json(slot);
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
        const limit = await bidService.getMonthlyLimit(userId);
        if (!limit)
            return res.status(404).json({ error: "Profile not found" });
        return res.json(limit);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=bidController.js.map