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
exports.getFullProfile = getFullProfile;
exports.upsertProfile = upsertProfile;
exports.setProfileAvatar = setProfileAvatar;
exports.getProfileCompletion = getProfileCompletion;
exports.setAttendance = setAttendance;
exports.createSectionEntry = createSectionEntry;
exports.updateSectionEntry = updateSectionEntry;
exports.deleteSectionEntry = deleteSectionEntry;
const profileModel = __importStar(require("../models/profileModel"));
const SECTION_TABLES = [
    "degrees",
    "certifications",
    "licences",
    "professional_courses",
    "employment_history",
];
function assertSection(section) {
    if (!SECTION_TABLES.includes(section)) {
        throw new Error("Invalid profile section");
    }
}
async function getFullProfile(userId) {
    const profile = await profileModel.findProfileByUserId(userId);
    if (!profile)
        return null;
    const [degrees, certifications, licences, professional_courses, employment_history] = await Promise.all([
        profileModel.findDegreesByUserId(userId),
        profileModel.findCertificationsByUserId(userId),
        profileModel.findLicencesByUserId(userId),
        profileModel.findCoursesByUserId(userId),
        profileModel.findEmploymentByUserId(userId),
    ]);
    return {
        ...profile,
        degrees,
        certifications,
        licences,
        professional_courses,
        employment_history,
    };
}
async function upsertProfile(userId, body) {
    const { full_name, bio, linkedin_url, phone_number } = body;
    return profileModel.upsertAlumniProfile(userId, full_name, bio, linkedin_url, phone_number);
}
async function setProfileAvatar(userId, profileImageUrl) {
    return profileModel.updateProfileImage(userId, profileImageUrl);
}
async function getProfileCompletion(userId) {
    const profile = await getFullProfile(userId);
    if (!profile)
        return null;
    const total = 7;
    let filled = 0;
    if (profile.full_name)
        filled++;
    if (profile.bio)
        filled++;
    if (profile.linkedin_url)
        filled++;
    if (profile.profile_image_url)
        filled++;
    if (profile.degrees.length)
        filled++;
    if (profile.certifications.length)
        filled++;
    if (profile.employment_history.length)
        filled++;
    return Math.round((filled / total) * 100);
}
async function setAttendance(targetUserId, attended) {
    return profileModel.updateAttendance(targetUserId, attended);
}
async function createSectionEntry(userId, section, data) {
    assertSection(section);
    const keys = Object.keys(data);
    const values = Object.values(data);
    await profileModel.insertSectionEntry(section, userId, keys, values);
}
async function updateSectionEntry(userId, section, id, data) {
    assertSection(section);
    const keys = Object.keys(data);
    const values = Object.values(data);
    return profileModel.updateSectionEntry(section, id, userId, keys, values);
}
async function deleteSectionEntry(userId, section, id) {
    assertSection(section);
    return profileModel.deleteSectionEntry(section, id, userId);
}
//# sourceMappingURL=profileService.js.map