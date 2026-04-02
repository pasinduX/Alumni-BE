"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const profileController_1 = require("../controllers/profileController");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: "uploads/", limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
        if (file.mimetype === "image/jpeg" || file.mimetype === "image/png")
            cb(null, true);
        else
            cb(new Error("Only JPEG/PNG images are allowed"));
    } });
router.get("/profile", auth_1.requireLogin, profileController_1.getProfile);
router.put("/profile", auth_1.requireLogin, (0, express_validator_1.body)("linkedin_url")
    .optional({ checkFalsy: true })
    .custom((val) => {
    const normalized = val.startsWith("http") ? val : `https://${val}`;
    if (!/^https?:\/\/(www\.)?linkedin\.com\/in\//i.test(normalized)) {
        throw new Error("LinkedIn URL must be on linkedin.com/in/...");
    }
    return true;
}), validate_1.handleValidationErrors, profileController_1.updateProfile);
router.post("/profile/image", auth_1.requireLogin, upload.single("image"), profileController_1.uploadImage);
router.get("/profile/completion", auth_1.requireLogin, profileController_1.completion);
router.post("/profile/:section", auth_1.requireLogin, validate_1.handleValidationErrors, profileController_1.createSectionEntry);
router.put("/profile/:section/:id", auth_1.requireLogin, validate_1.handleValidationErrors, profileController_1.updateSectionEntry);
router.delete("/profile/:section/:id", auth_1.requireLogin, profileController_1.deleteSectionEntry);
router.put("/profile/event-attendance", auth_1.requireLogin, profileController_1.setAttendance);
exports.default = router;
//# sourceMappingURL=profiles.js.map