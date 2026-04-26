"use strict";
/**
 * Monthly bid winner selector
 *
 * Runs at 23:59 on days 28-31 of every month.
 * The handler checks whether tomorrow is the 1st of a new month; if so it
 * selects the highest-amount bid for the current YYYY-MM as the winner,
 * marks all other bids for that month as non-winners, and writes the
 * winning alumni's profile id into the settings.featured_profile_id key.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMonthlyBidWinnerJob = startMonthlyBidWinnerJob;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("../config/db");
function isLastDayOfMonth() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getDate() === 1; // tomorrow is the 1st → today is the last day
}
async function selectMonthlyBidWinner() {
    if (!isLastDayOfMonth()) {
        // Not the last day of the month – nothing to do.
        return;
    }
    const now = new Date();
    const bidMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    console.log(`[monthlyBidWinner] Running winner selection for month: ${bidMonth}`);
    // Fetch all bids for this month, highest amount first.
    // Ties are broken by earliest created_at (first mover wins).
    const bidsResult = await (0, db_1.query)(`SELECT id, alumni_id, amount
     FROM monthly_bids
     WHERE bid_month = $1
     ORDER BY amount DESC, created_at ASC`, [bidMonth]);
    const bids = bidsResult.rows;
    if (bids.length === 0) {
        console.log(`[monthlyBidWinner] No bids found for ${bidMonth}. Nothing to do.`);
        return;
    }
    const winner = bids[0];
    // Mark winner
    await (0, db_1.query)("UPDATE monthly_bids SET is_winner = TRUE,  updated_at = NOW() WHERE id = $1", [winner.id]);
    // Clear winner flag on all other bids for this month
    if (bids.length > 1) {
        await (0, db_1.query)("UPDATE monthly_bids SET is_winner = FALSE, updated_at = NOW() WHERE bid_month = $1 AND id <> $2", [bidMonth, winner.id]);
    }
    // Persist the winning alumni id to the settings table
    await (0, db_1.query)(`INSERT INTO settings (key, value, updated_at)
     VALUES ('featured_profile_id', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`, [String(winner.alumni_id)]);
    console.log(`[monthlyBidWinner] Winner for ${bidMonth}: alumni_id=${winner.alumni_id}, ` +
        `amount=${Number(winner.amount).toFixed(2)}. ` +
        `featured_profile_id updated.`);
}
/**
 * Register the cron job.
 * Schedule: "59 23 28-31 * *"  →  23:59 on the 28th–31st of every month.
 * The handler itself verifies that today is actually the last day of the month
 * before doing any work, so it is safe to fire on days 28-30 that are not the
 * final day (e.g. February 28 in a non-leap year is the last day).
 */
function startMonthlyBidWinnerJob() {
    node_cron_1.default.schedule("59 23 28-31 * *", async () => {
        try {
            await selectMonthlyBidWinner();
        }
        catch (err) {
            console.error("[monthlyBidWinner] Unexpected error:", err);
        }
    });
    console.log("[monthlyBidWinner] Monthly bid winner job scheduled (59 23 28-31 * *).");
}
//# sourceMappingURL=monthlyBidWinner.js.map