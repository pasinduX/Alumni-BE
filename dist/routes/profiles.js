"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const profileController_1 = require("../controllers/profileController");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: "uploads/" });
router.get("/me", auth_1.requireAuth, profileController_1.getMyProfile);
router.put("/me", auth_1.requireAuth, profileController_1.updateMyProfile);
router.post("/me/avatar", auth_1.requireAuth, upload.single("avatar"), profileController_1.uploadProfileImage);
exports.default = router;
//# sourceMappingURL=profiles.js.map