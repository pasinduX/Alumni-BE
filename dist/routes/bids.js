"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bidController_1 = require("../controllers/bidController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
router.post("/bidding/place", auth_1.requireLogin, (0, express_validator_1.body)("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"), validate_1.handleValidationErrors, bidController_1.placeBid);
router.put("/bidding/update", auth_1.requireLogin, (0, express_validator_1.body)("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"), validate_1.handleValidationErrors, bidController_1.updateBid);
router.delete("/bidding/cancel", auth_1.requireLogin, bidController_1.cancelBid);
router.get("/bidding/status", auth_1.requireLogin, bidController_1.statusBid);
router.get("/bidding/history", auth_1.requireLogin, bidController_1.historyBid);
router.get("/bidding/tomorrow-slot", auth_1.requireLogin, bidController_1.tomorrowSlot);
router.get("/bidding/monthly-limit", auth_1.requireLogin, bidController_1.monthlyLimit);
exports.default = router;
//# sourceMappingURL=bids.js.map