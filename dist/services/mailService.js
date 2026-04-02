"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("../config");
async function getTransporter() {
    const { host, port, user, pass, secure } = config_1.config.email;
    if (host && port && user && pass) {
        try {
            const transporter = nodemailer_1.default.createTransport({ host, port, secure, auth: { user, pass } });
            await transporter.verify();
            return transporter;
        }
        catch (err) {
            console.warn("Failed to create mail transporter from SMTP config", err);
            return null;
        }
    }
    if (process.env.NODE_ENV !== "production") {
        try {
            const testAccount = await nodemailer_1.default.createTestAccount();
            const transporter = nodemailer_1.default.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            console.info("Using Ethereal email account for local development:", testAccount.user);
            return transporter;
        }
        catch (err) {
            console.warn("Failed to create ethereal mail transporter", err);
            return null;
        }
    }
    console.warn("SMTP_URL not configured; skipping email delivery in production");
    return null;
}
async function sendEmail(to, subject, text, html) {
    const transporter = await getTransporter();
    if (!transporter) {
        console.warn("SMTP not configured. Skipping email to:", to);
        return;
    }
    const info = await transporter.sendMail({
        from: config_1.config.email.from,
        to,
        subject,
        text,
        html,
    });
    if (nodemailer_1.default.getTestMessageUrl(info)) {
        console.info("Preview email URL:", nodemailer_1.default.getTestMessageUrl(info));
    }
}
//# sourceMappingURL=mailService.js.map