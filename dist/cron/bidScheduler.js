"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBidScheduler = startBidScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const bidService_1 = require("../services/bidService");
function startBidScheduler() {
    node_cron_1.default.schedule("0 0 * * *", async () => {
        try {
            const slotDate = (0, bidService_1.getSlotDateForTomorrow)();
            await (0, bidService_1.processSlot)(slotDate);
            console.log(`Bid slot processed for ${slotDate.toISOString().slice(0, 10)}`);
        }
        catch (err) {
            console.error("Error processing bid slot:", err);
        }
    });
}
//# sourceMappingURL=bidScheduler.js.map