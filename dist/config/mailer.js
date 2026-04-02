"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const index_1 = require("./index");
const transporter = nodemailer_1.default.createTransport({
    host: index_1.config.email.host,
    port: index_1.config.email.port,
    secure: index_1.config.email.secure,
    auth: {
        user: index_1.config.email.user,
        pass: index_1.config.email.pass,
    },
});
async function sendEmail(to, subject, text, html) {
    const mailOptions = {
        from: index_1.config.email.from,
        to,
        subject,
        text,
        html,
    };
    const info = await transporter.sendMail(mailOptions);
    if (nodemailer_1.default.getTestMessageUrl(info)) {
        console.info("Email preview URL:", nodemailer_1.default.getTestMessageUrl(info));
    }
    return info;
}
exports.default = transporter;
//# sourceMappingURL=mailer.js.map