"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyProfile = getMyProfile;
exports.updateMyProfile = updateMyProfile;
exports.uploadProfileImage = uploadProfileImage;
const profileService_1 = require("../services/profileService");
async function getMyProfile(req, res, next) {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const profile = await (0, profileService_1.getProfileByUserId)(userId);
        if (!profile) {
            return res.status(404).json({ error: "Profile not found" });
        }
        return res.json(profile);
    }
    catch (err) {
        next(err);
    }
}
async function updateMyProfile(req, res, next) {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    const body = req.body;
    try {
        const updated = await (0, profileService_1.upsertProfileByUserId)(userId, body);
        return res.json(updated);
    }
    catch (err) {
        next(err);
    }
}
async function uploadProfileImage(req, res, next) {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: "Unauthorized" });
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    const imagePath = `/uploads/${req.file.filename}`;
    try {
        const profile = await (0, profileService_1.setProfileAvatar)(userId, imagePath);
        return res.json({ profile });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=profileController.js.map