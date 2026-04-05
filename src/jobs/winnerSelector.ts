import cron from "node-cron";
import { query } from "../config/db";
import { sendEmail } from "../config/mailer";

const selectWinner = async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const displayDate = tomorrow.toISOString().slice(0, 10);

  try {
    const bids = await query(
      "SELECT id, user_id, amount, placed_at FROM bids WHERE bid_date = $1 AND status = 'active' ORDER BY amount DESC, placed_at ASC",
      [displayDate],
    );

    if ((bids.rowCount ?? 0) === 0) {
      console.info("No bids for tomorrow", displayDate);
      await query("UPDATE bids SET status='lost' WHERE bid_date=$1 AND status='active'", [displayDate]);
      return;
    }

    const winner = bids.rows[0];
    await query("UPDATE bids SET status='won' WHERE id=$1", [winner.id]);
    await query("UPDATE bids SET status='lost' WHERE bid_date=$1 AND id <> $2 AND status='active'", [displayDate, winner.id]);
    await query("INSERT INTO bid_winners (bid_id, user_id, display_date, is_active) VALUES ($1,$2,$3,true)", [winner.id, winner.user_id, displayDate]);

    await query("UPDATE alumni_profiles SET monthly_win_count = monthly_win_count + 1 WHERE user_id = $1", [winner.user_id]);

    const winnerUser = await query("SELECT email FROM users WHERE id = $1", [winner.user_id]);
    if ((winnerUser.rowCount ?? 0) > 0) {
      const winnerEmail = winnerUser.rows[0].email;
      await sendEmail(
        winnerEmail,
        `Congratulations! Alumni of the Day for ${displayDate}`,
        `You are selected for ${displayDate}`,
        `<p>Congratulations! You are Alumni of the Day for <strong>${displayDate}</strong>.</p>`,
      );
    }

    const losers = bids.rows.filter((b: any) => b.user_id !== winner.user_id);
    for (const loser of losers) {
      const loserUser = await query("SELECT email FROM users WHERE id = $1", [loser.user_id]);
      if ((loserUser.rowCount ?? 0) === 0) continue;
      await sendEmail(
        loserUser.rows[0].email,
        `Bid result for ${displayDate}`,
        `You did not win the slot for ${displayDate}. Better luck next time!`,
      );
    }

    const firstOfMonth = new Date().getDate() === 1;
    if (firstOfMonth) {
      await query("UPDATE alumni_profiles SET monthly_win_count = 0, attended_event_this_month = false");
      console.info("Monthly reset executed");
    }

    console.info("Winner selection completed for", displayDate);
  } catch (err) {
    console.error("Winner selection error", err);
  }
};

export function startWinnerScheduler() {
  cron.schedule("0 0 * * *", selectWinner, { timezone: "UTC" });
  console.info("Cron job scheduled at 00:00 UTC for winner selection");
}
