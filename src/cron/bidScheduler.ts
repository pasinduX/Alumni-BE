import cron from "node-cron";
import { processSlot, getSlotDateForTomorrow } from "../services/bidService";

export function startBidScheduler() {
  // Run at midnight server time to select the winner for the next day
  cron.schedule("0 0 * * *", async () => {
    try {
      const slotDate = getSlotDateForTomorrow();
      await processSlot(slotDate);
      console.log(`Bid slot processed for ${slotDate.toISOString().slice(0, 10)}`);
    } catch (err) {
      console.error("Error processing bid slot:", err);
    }
  });
}
