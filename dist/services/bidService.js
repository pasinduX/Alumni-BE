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
exports.getSlotDateForTomorrow = getSlotDateForTomorrow;
exports.getTomorrowDateString = getTomorrowDateString;
exports.getOrCreateSlot = getOrCreateSlot;
exports.getMonthlyProfile = getMonthlyProfile;
exports.getExistingActiveBid = getExistingActiveBid;
exports.insertBid = insertBid;
exports.updateBidAmount = updateBidAmount;
exports.cancelActiveBid = cancelActiveBid;
exports.getUserBidAmount = getUserBidAmount;
exports.getTopActiveBid = getTopActiveBid;
exports.getBidHistory = getBidHistory;
exports.getMonthlyLimit = getMonthlyLimit;
exports.getTomorrowSlot = getTomorrowSlot;
exports.getUserBidStatus = getUserBidStatus;
exports.processSlot = processSlot;
const bidModel = __importStar(require("../models/bidModel"));
const prisma_1 = __importDefault(require("../prisma"));
const config_1 = require("../config");
const mailService_1 = require("./mailService");
function getSlotDateForTomorrow() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
}
function getTomorrowDateString() {
    return getSlotDateForTomorrow().toISOString().slice(0, 10);
}
async function getOrCreateSlot(slotDate) {
    const dateOnly = new Date(slotDate);
    dateOnly.setHours(0, 0, 0, 0);
    return prisma_1.default.bidSlot.upsert({
        where: { slotDate: dateOnly },
        create: { slotDate: dateOnly },
        update: {},
    });
}
async function getMonthlyProfile(userId) {
    return bidModel.findMonthlyProfile(userId);
}
async function getExistingActiveBid(userId, bidDate) {
    return bidModel.findActiveBid(userId, bidDate);
}
async function insertBid(userId, bidDate, amount) {
    await bidModel.createBid(userId, bidDate, amount);
}
async function updateBidAmount(bidId, amount) {
    await bidModel.setBidAmount(bidId, amount);
}
async function cancelActiveBid(userId, bidDate) {
    return bidModel.cancelBid(userId, bidDate);
}
async function getUserBidAmount(userId, bidDate) {
    return bidModel.findBidAmount(userId, bidDate);
}
async function getTopActiveBid(bidDate) {
    return bidModel.findTopBid(bidDate);
}
async function getBidHistory(userId) {
    return bidModel.findBidHistory(userId);
}
async function getMonthlyLimit(userId) {
    const profile = await getMonthlyProfile(userId);
    if (!profile) {
        return null;
    }
    const wins = Number(profile.monthly_win_count ?? 0);
    const limit = profile.attended_event_this_month ? 4 : 3;
    return { wins_this_month: wins, limit, remaining_slots: Math.max(limit - wins, 0) };
}
async function getTomorrowSlot(userId) {
    const bidDate = getTomorrowDateString();
    const yourBid = await getUserBidAmount(userId, bidDate);
    const top = await getTopActiveBid(bidDate);
    const hasBid = !!yourBid;
    const status = !hasBid ? "no_bid" : top?.user_id === userId ? "winning" : "losing";
    return {
        date: bidDate,
        has_bid: hasBid,
        your_bid: yourBid ? Number(yourBid.amount) : null,
        status,
    };
}
async function getUserBidStatus(userId) {
    const bidDate = getTomorrowDateString();
    const yourBid = await getUserBidAmount(userId, bidDate);
    if (!yourBid) {
        return { your_bid: null, status: "no_bid" };
    }
    const top = await getTopActiveBid(bidDate);
    const status = top?.user_id === userId ? "winning" : "losing";
    return { your_bid: Number(yourBid.amount), status };
}
async function processSlot(slotDate = getSlotDateForTomorrow()) {
    const slot = await getOrCreateSlot(slotDate);
    const bids = await prisma_1.default.bid.findMany({
        where: { slotId: slot.id },
        include: {
            profile: {
                include: { monthlyAppearances: true, user: true },
            },
        },
    });
    if (!bids.length) {
        return { winnerProfileId: null, winningAmount: null };
    }
    const monthKey = `${slotDate.getFullYear()}-${String(slotDate.getMonth() + 1).padStart(2, "0")}`;
    const allowedBids = bids.filter((bid) => {
        const appearance = bid.profile.monthlyAppearances.find((m) => m.monthYear === monthKey);
        const currentCount = appearance?.appearanceCount ?? 0;
        const allowed = config_1.config.bidding.monthlyLimit + (appearance?.attendedEvent ? 1 : 0);
        return currentCount < allowed;
    });
    if (!allowedBids.length) {
        return { winnerProfileId: null, winningAmount: null };
    }
    const winningBid = allowedBids.reduce((best, candidate) => {
        if (!best)
            return candidate;
        if (candidate.amount > best.amount)
            return candidate;
        if (candidate.amount === best.amount) {
            return candidate.placedAt < best.placedAt ? candidate : best;
        }
        return best;
    }, allowedBids[0]);
    if (!winningBid) {
        return { winnerProfileId: null, winningAmount: null };
    }
    await prisma_1.default.$transaction(async (tx) => {
        await tx.bidSlot.update({
            where: { id: slot.id },
            data: {
                winnerProfileId: winningBid.profileId,
                winningAmount: winningBid.amount,
                selectionTime: new Date(),
            },
        });
        await tx.bid.updateMany({
            where: { slotId: slot.id },
            data: { isWinning: false },
        });
        await tx.bid.update({
            where: { id: winningBid.id },
            data: { isWinning: true },
        });
        const existingAppearance = await tx.monthlyAppearance.findUnique({
            where: { profileId_monthYear: { profileId: winningBid.profileId, monthYear: monthKey } },
        });
        if (existingAppearance) {
            await tx.monthlyAppearance.update({
                where: { id: existingAppearance.id },
                data: { appearanceCount: existingAppearance.appearanceCount + 1 },
            });
        }
        else {
            await tx.monthlyAppearance.create({
                data: { profileId: winningBid.profileId, monthYear: monthKey, appearanceCount: 1 },
            });
        }
    });
    await notifyBidders(slot.id);
    return { winnerProfileId: winningBid.profileId, winningAmount: Number(winningBid.amount) };
}
async function notifyBidders(slotId) {
    const bids = await prisma_1.default.bid.findMany({
        where: { slotId },
        include: { profile: { include: { user: true } } },
    });
    for (const bid of bids) {
        const userEmail = bid.profile.user.email;
        const status = bid.isWinning ? "won" : "lost";
        const subject = `Your bid ${status} for Featured Alumni of the Day`;
        const body = `Hi ${bid.profile.fullName ?? "alumni"},\n\n` +
            `Your bid for the ${slotId} slot has ${status}.` +
            (bid.isWinning
                ? `\n\nYou will be featured tomorrow!\n\nThank you for participating.`
                : `\n\nBetter luck next time!`);
        (0, mailService_1.sendEmail)(userEmail, subject, body).catch((err) => {
            console.warn("Failed to send bid notification", err);
        });
    }
}
//# sourceMappingURL=bidService.js.map