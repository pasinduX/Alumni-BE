"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
    jwtSecret: process.env.SECRET_KEY ?? "change_me",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    email: {
        from: process.env.EMAIL_FROM ?? "no-reply@alumni-be.local",
        smtpUrl: process.env.SMTP_URL ?? "",
    },
    bidding: {
        monthlyLimit: 3,
    },
};
//# sourceMappingURL=index.js.map