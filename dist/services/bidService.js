"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSlotDateForTomorrow = getSlotDateForTomorrow;
exports.getOrCreateSlot = getOrCreateSlot;
exports.placeBid = placeBid;
exports.getBidStatus = getBidStatus;
exports.processSlot = processSlot;
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
async function getOrCreateSlot(slotDate) {
    const dateOnly = new Date(slotDate);
    dateOnly.setHours(0, 0, 0, 0);
    return prisma_1.default.bidSlot.upsert({
        where: { slotDate: dateOnly },
        create: { slotDate: dateOnly },
        update: {},
    });
}
async function placeBid(profileId, amount) {
    const slotDate = getSlotDateForTomorrow();
    const slot = await getOrCreateSlot(slotDate);
    const bid = await prisma_1.default.bid.upsert({
        where: { profileId_slotId: { profileId, slotId: slot.id } },
        create: { profileId, slotId: slot.id, amount },
        update: { amount, placedAt: new Date() },
    });
    return bid;
}
async function getBidStatus(profileId) {
    const slotDate = getSlotDateForTomorrow();
    const slot = await prisma_1.default.bidSlot.findUnique({
        where: { slotDate },
        include: { bids: true },
    });
    if (!slot) {
        return "none";
    }
    const bid = slot.bids.find((b) => b.profileId === profileId);
    if (!bid) {
        return "none";
    }
    return bid.isWinning ? "winning" : "losing";
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
        // no eligible bidders
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
    const winner = bids.find((b) => b.isWinning);
    for (const bid of bids) {
        const userEmail = bid.profile.user.email;
        const status = bid.isWinning ? "won" : "lost";
        const subject = `Your bid ${status} for Featured Alumni of the Day`;
        const body = `Hi ${bid.profile.fullName ?? "alumni"},\n\n` +
            `Your bid for the ${slotId} slot has ${status}.` +
            (bid.isWinning
                ? `\n
You will be featured tomorrow!\n\nThank you for participating.`
                : `\n
Better luck next time!`);
        // Fire and forget
        (0, mailService_1.sendEmail)(userEmail, subject, body).catch((err) => {
            console.warn("Failed to send bid notification", err);
        });
    }
}
//# sourceMappingURL=bidService.js.map