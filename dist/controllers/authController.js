"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../prisma"));
const config_1 = require("../config");
const SALT_ROUNDS = 10;
async function registerUser(email, password) {
    const existing = await prisma_1.default.user.findUnique({ where: { email } });
    if (existing) {
        const err = new Error("Email already in use");
        // @ts-expect-error allow custom field
        err.status = 409;
        throw err;
    }
    const passwordHash = await bcrypt_1.default.hash(password, SALT_ROUNDS);
    return prisma_1.default.user.create({
        data: {
            email,
            passwordHash,
        },
    });
}
async function loginUser(email, password) {
    const user = await prisma_1.default.user.findUnique({ where: { email } });
    if (!user) {
        const err = new Error("Invalid credentials");
        // @ts-expect-error allow custom field
        err.status = 401;
        throw err;
    }
    const matches = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!matches) {
        const err = new Error("Invalid credentials");
        // @ts-expect-error allow custom field
        err.status = 401;
        throw err;
    }
    const secret = config_1.config.jwtSecret;
    const options = { expiresIn: config_1.config.jwtExpiresIn };
    return jsonwebtoken_1.default.sign({ userId: user.id }, secret, options);
}
//# sourceMappingURL=authController.js.map