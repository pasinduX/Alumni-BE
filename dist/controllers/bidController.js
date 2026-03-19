"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeBidHandler = placeBidHandler;
exports.getBidStatusHandler = getBidStatusHandler;
const express_validator_1 = require("express-validator");
const profileService_1 = require("../services/profileService");
const bidService_1 = require("../services/bidService");
async function placeBidHandler(req, res, next) {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const profile = await (0, profileService_1.getProfileByUserId)(userId);
    if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
    }
    const body = req.body;
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Amount must be a positive number" });
    }
    try {
        await (0, bidService_1.placeBid)(profile.id, amount);
        return res.status(201).json({ status: "submitted" });
    }
    catch (err) {
        next(err);
    }
}
async function getBidStatusHandler(req, res, next) {
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const profile = await (0, profileService_1.getProfileByUserId)(userId);
    if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
    }
    try {
        const status = await (0, bidService_1.getBidStatus)(profile.id);
        const response = { status };
        return res.json(response);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=bidController.js.map