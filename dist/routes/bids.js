"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const bidController_1 = require("../controllers/bidController");
const router = (0, express_1.Router)();
router.get("/status", auth_1.requireAuth, bidController_1.getBidStatusHandler);
router.post("/", auth_1.requireAuth, (0, express_validator_1.body)("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"), bidController_1.placeBidHandler);
exports.default = router;
//# sourceMappingURL=bids.js.map