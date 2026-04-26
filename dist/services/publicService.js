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
exports.getAlumniOfTheDay = getAlumniOfTheDay;
const profileModel = __importStar(require("../models/profileModel"));
async function getAlumniOfTheDay() {
    const today = new Date().toISOString().slice(0, 10);
    const row = await profileModel.findAlumniOfTheDay(today);
    if (!row)
        return null;
    const [degrees, certifications, licences, professional_courses, employment_history] = await Promise.all([
        profileModel.findDegreesByUserId(row.user_id),
        profileModel.findCertificationsByUserId(row.user_id),
        profileModel.findLicencesByUserId(row.user_id),
        profileModel.findCoursesByUserId(row.user_id),
        profileModel.findEmploymentByUserId(row.user_id),
    ]);
    return {
        ...row,
        degrees,
        certifications,
        licences,
        professional_courses,
        employment_history,
    };
}
//# sourceMappingURL=publicService.js.map