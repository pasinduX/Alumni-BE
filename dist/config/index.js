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
    databaseUrl: process.env.DATABASE_URL ?? "",
    sessionSecret: process.env.SESSION_SECRET ?? "change_me",
    jwtSecret: process.env.SECRET_KEY ?? "change_me",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    email: {
        from: process.env.EMAIL_FROM ?? "no-reply@alumni-be.local",
        host: process.env.SMTP_HOST ?? "",
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
        user: process.env.SMTP_USER ?? "",
        pass: process.env.SMTP_PASS ?? "",
        secure: process.env.SMTP_SECURE === "true",
    },
    allowedDomain: process.env.ALLOWED_DOMAIN ?? "eastminster.ac.uk",
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") ?? ["*"],
    uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
    bidding: {
        monthlyLimit: 3,
    },
};
//# sourceMappingURL=index.js.map