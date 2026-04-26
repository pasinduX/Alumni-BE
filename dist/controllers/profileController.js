"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.uploadImage = uploadImage;
exports.completion = completion;
exports.createSectionEntry = createSectionEntry;
exports.updateSectionEntry = updateSectionEntry;
exports.deleteSectionEntry = deleteSectionEntry;
exports.setAttendance = setAttendance;
const profileService = __importStar(require("../services/profileService"));
function sanitizeSectionData(data) {
    const sanitized = { ...data };
    ["start_date", "end_date", "completed_at"].forEach((dateKey) => {
        if (sanitized[dateKey] === "" || sanitized[dateKey] === null || sanitized[dateKey] === undefined) {
            delete sanitized[dateKey];
        }
    });
    delete sanitized._csrf;
    delete sanitized.submit;
    return sanitized;
}
function validateSection(section) {
    const validSections = ["degrees", "certifications", "licences", "professional_courses", "employment_history"];
    return validSections.includes(section);
}
async function getProfile(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const profile = await profileService.getFullProfile(userId);
        if (!profile)
            return res.status(404).json({ error: "Profile not found" });
        return res.json(profile);
    }
    catch (err) {
        next(err);
    }
}
async function updateProfile(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        let { full_name, bio, linkedin_url, phone_number } = req.body;
        if (linkedin_url && !/^https?:\/\//i.test(linkedin_url)) {
            linkedin_url = `https://${linkedin_url}`;
        }
        const profile = await profileService.upsertProfile(userId, { full_name, bio, linkedin_url, phone_number });
        return res.json(profile);
    }
    catch (err) {
        next(err);
    }
}
async function uploadImage(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        if (!req.file)
            return res.status(400).json({ error: "No file uploaded" });
        const profileImageUrl = `/uploads/${req.file.filename}`;
        const profile = await profileService.setProfileAvatar(userId, profileImageUrl);
        return res.json(profile);
    }
    catch (err) {
        next(err);
    }
}
async function completion(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const percent = await profileService.getProfileCompletion(userId);
        if (percent === null)
            return res.status(404).json({ error: "Profile not found" });
        return res.json({ completion: percent });
    }
    catch (err) {
        next(err);
    }
}
async function createSectionEntry(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const section = String(req.params.section);
        if (!validateSection(section)) {
            return res.status(400).json({ error: "Invalid section" });
        }
        const data = sanitizeSectionData(req.body);
        if (data.url && !/^https?:\/\//.test(data.url)) {
            return res.status(400).json({ error: "URL must be valid" });
        }
        await profileService.createSectionEntry(userId, section, data);
        return res.status(201).json({ message: "Entry created" });
    }
    catch (err) {
        next(err);
    }
}
async function updateSectionEntry(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const section = String(req.params.section);
        const id = String(req.params.id);
        if (!validateSection(section)) {
            return res.status(400).json({ error: "Invalid section" });
        }
        const data = sanitizeSectionData(req.body);
        if (data.url && !/^https?:\/\//.test(data.url)) {
            return res.status(400).json({ error: "URL must be valid" });
        }
        const updated = await profileService.updateSectionEntry(userId, section, id, data);
        if (!updated) {
            return res.status(404).json({ error: "Not found or unauthorized" });
        }
        return res.json({ message: "Entry updated" });
    }
    catch (err) {
        next(err);
    }
}
async function deleteSectionEntry(req, res, next) {
    try {
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const section = String(req.params.section);
        const id = String(req.params.id);
        if (!validateSection(section)) {
            return res.status(400).json({ error: "Invalid section" });
        }
        const deleted = await profileService.deleteSectionEntry(userId, section, id);
        if (!deleted) {
            return res.status(404).json({ error: "Not found or unauthorized" });
        }
        return res.json({ message: "Entry deleted" });
    }
    catch (err) {
        next(err);
    }
}
async function setAttendance(req, res, next) {
    try {
        const { attended } = req.body;
        const userId = req.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        let targetUserId = userId;
        if (req.userRole === "admin" && req.body.userId) {
            targetUserId = req.body.userId;
        }
        const profile = await profileService.setAttendance(targetUserId, attended === true);
        if (!profile)
            return res.status(404).json({ error: "Profile not found" });
        return res.json(profile);
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=profileController.js.map