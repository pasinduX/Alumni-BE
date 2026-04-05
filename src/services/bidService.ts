import * as bidModel from "../models/bidModel";
import type { Prisma } from "../generated/prisma/client";
import prisma from "../prisma";
import { config } from "../config";
import { sendEmail } from "./mailService";

import type { BidStatus } from "../types/api";

type BidWithProfile = Prisma.BidGetPayload<{
  include: {
    profile: {
      include: {
        monthlyAppearances: true;
        user: true;
      };
    };
  };
}>;

export function getSlotDateForTomorrow(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

export function getTomorrowDateString(): string {
  return getSlotDateForTomorrow().toISOString().slice(0, 10);
}

export async function getOrCreateSlot(slotDate: Date) {
  const dateOnly = new Date(slotDate);
  dateOnly.setHours(0, 0, 0, 0);
  return prisma.bidSlot.upsert({
    where: { slotDate: dateOnly },
    create: { slotDate: dateOnly },
    update: {},
  });
}

export async function getMonthlyProfile(userId: string) {
  return bidModel.findMonthlyProfile(userId);
}

export async function getExistingActiveBid(userId: string, bidDate: string) {
  return bidModel.findActiveBid(userId, bidDate);
}

export async function insertBid(userId: string, bidDate: string, amount: number) {
  await bidModel.createBid(userId, bidDate, amount);
}

export async function updateBidAmount(bidId: string, amount: number) {
  await bidModel.setBidAmount(bidId, amount);
}

export async function cancelActiveBid(userId: string, bidDate: string) {
  return bidModel.cancelBid(userId, bidDate);
}

export async function getUserBidAmount(userId: string, bidDate: string) {
  return bidModel.findBidAmount(userId, bidDate);
}

export async function getTopActiveBid(bidDate: string) {
  return bidModel.findTopBid(bidDate);
}

export async function getBidHistory(userId: string) {
  return bidModel.findBidHistory(userId);
}

export async function getMonthlyLimit(userId: string) {
  const profile = await getMonthlyProfile(userId);
  if (!profile) {
    return null;
  }

  const wins = Number(profile.monthly_win_count ?? 0);
  const limit = profile.attended_event_this_month ? 4 : 3;
  return { wins_this_month: wins, limit, remaining_slots: Math.max(limit - wins, 0) };
}

export async function getTomorrowSlot(userId: string) {
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

export async function getUserBidStatus(userId: string) {
  const bidDate = getTomorrowDateString();
  const yourBid = await getUserBidAmount(userId, bidDate);
  if (!yourBid) {
    return { your_bid: null, status: "no_bid" as const };
  }

  const top = await getTopActiveBid(bidDate);
  const status = top?.user_id === userId ? "winning" : "losing";
  return { your_bid: Number(yourBid.amount), status };
}

export interface ProcessResult {
  winnerProfileId: string | null;
  winningAmount: number | null;
}

export async function processSlot(slotDate: Date = getSlotDateForTomorrow()): Promise<ProcessResult> {
  const slot = await getOrCreateSlot(slotDate);

  const bids: BidWithProfile[] = await prisma.bid.findMany({
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
    const allowed = config.bidding.monthlyLimit + (appearance?.attendedEvent ? 1 : 0);
    return currentCount < allowed;
  });

  if (!allowedBids.length) {
    return { winnerProfileId: null, winningAmount: null };
  }

  const winningBid = allowedBids.reduce<BidWithProfile | null>((best, candidate) => {
    if (!best) return candidate;
    if (candidate.amount > best.amount) return candidate;
    if (candidate.amount === best.amount) {
      return candidate.placedAt < best.placedAt ? candidate : best;
    }
    return best;
  }, allowedBids[0]);

  if (!winningBid) {
    return { winnerProfileId: null, winningAmount: null };
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    } else {
      await tx.monthlyAppearance.create({
        data: { profileId: winningBid.profileId, monthYear: monthKey, appearanceCount: 1 },
      });
    }
  });

  await notifyBidders(slot.id);

  return { winnerProfileId: winningBid.profileId, winningAmount: Number(winningBid.amount) };
}

async function notifyBidders(slotId: string) {
  const bids = await prisma.bid.findMany({
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

    sendEmail(userEmail, subject, body).catch((err) => {
      console.warn("Failed to send bid notification", err);
    });
  }
}
