"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfileByUserId = getProfileByUserId;
exports.upsertProfileByUserId = upsertProfileByUserId;
exports.setProfileAvatar = setProfileAvatar;
const prisma_1 = __importDefault(require("../prisma"));
async function getProfileByUserId(userId) {
    return prisma_1.default.profile.findUnique({
        where: { userId },
        include: {
            degrees: true,
            certifications: true,
            licences: true,
            professionalCourses: true,
            employmentHistory: true,
        },
    });
}
async function upsertProfileByUserId(userId, body) {
    const { fullName, biography, linkedinUrl } = body;
    return prisma_1.default.profile.upsert({
        where: { userId },
        create: {
            userId,
            fullName,
            biography,
            linkedinUrl,
        },
        update: {
            fullName,
            biography,
            linkedinUrl,
        },
    });
}
async function setProfileAvatar(userId, imagePath) {
    return prisma_1.default.profile.update({
        where: { userId },
        data: { profileImagePath: imagePath },
    });
}
//# sourceMappingURL=profileService.js.map