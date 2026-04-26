"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateKey = generateKey;
exports.listKeys = listKeys;
exports.keyStats = keyStats;
exports.revokeKey = revokeKey;
const apiKeysService_1 = require("../services/apiKeysService");
async function generateKey(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const clientName = req.body.client_name || req.body.label;
        const permissions = Array.isArray(req.body.permissions)
            ? req.body.permissions.map(String)
            : [];
        if (!clientName) {
            return res.status(400).json({ error: "client_name is required" });
        }
        const result = await (0, apiKeysService_1.generateApiKey)(userId, clientName, permissions);
        return res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
}
async function listKeys(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const keys = await (0, apiKeysService_1.listApiKeys)(userId);
        return res.json({ keys });
    }
    catch (err) {
        next(err);
    }
}
async function keyStats(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const stats = await (0, apiKeysService_1.getApiKeyStats)(userId, String(req.params.id));
        return res.json(stats);
    }
    catch (err) {
        next(err);
    }
}
async function revokeKey(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        await (0, apiKeysService_1.revokeApiKey)(userId, String(req.params.id));
        return res.json({ message: "Revoked" });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=apiKeysController.js.map