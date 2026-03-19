"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("../config");
function getTransporter() {
    if (!config_1.config.email.smtpUrl || !config_1.config.email.smtpUrl.trim()) {
        return null;
    }
    try {
        return nodemailer_1.default.createTransport(config_1.config.email.smtpUrl);
    }
    catch (err) {
        console.warn("Failed to create mail transporter", err);
        return null;
    }
}
async function sendEmail(to, subject, text) {
    const transporter = getTransporter();
    if (!transporter) {
        console.warn("SMTP not configured. Skipping email to:", to);
        return;
    }
    await transporter.sendMail({
        from: config_1.config.email.from,
        to,
        subject,
        text,
    });
}
//# sourceMappingURL=mailService.js.map