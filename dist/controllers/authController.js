"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.verifyEmail = verifyEmail;
exports.login = login;
exports.logout = logout;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const authService_1 = require("../services/authService");
const AppError_1 = require("../utils/AppError");
async function register(req, res, next) {
    try {
        const { email, password, role } = req.body;
        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
        await (0, authService_1.registerUser)(email, password, baseUrl, String(role || "alumni"));
        return res.status(201).json({ message: "Verification email sent" });
    }
    catch (err) {
        next(err);
    }
}
async function verifyEmail(req, res, next) {
    try {
        const token = String(req.query.token || "");
        if (!token) {
            return res.status(400).json({ error: "Token required" });
        }
        const role = await (0, authService_1.verifyEmailToken)(token);
        const loginPath = role === "university_staff" ? "/university/login" : "/web/login";
        return res.redirect(`${loginPath}?verified=1`);
    }
    catch (err) {
        if (err instanceof AppError_1.AppError && err.code === "INVALID_TOKEN") {
            return res.redirect("/web/login?verified=0&error=invalid_token");
        }
        if (err instanceof AppError_1.AppError && err.code === "TOKEN_EXPIRED") {
            return res.redirect("/web/login?verified=0&error=token_expired");
        }
        return next(err);
    }
}
async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        const user = await (0, authService_1.authenticateUser)(email, password);
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials or unverified" });
        }
        const session = req.session;
        session.userId = user.id;
        session.role = user.role;
        session.email = email;
        return res.status(200).json({ message: "Logged in", role: user.role });
    }
    catch (err) {
        next(err);
    }
}
async function logout(req, res, next) {
    try {
        req.session.destroy((err) => {
            if (err)
                return next(err);
            return res.status(200).json({ message: "Logged out" });
        });
    }
    catch (err) {
        next(err);
    }
}
async function forgotPassword(req, res, next) {
    try {
        const { email } = req.body;
        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
        await (0, authService_1.requestPasswordReset)(email, baseUrl);
        return res.status(200).json({ message: "If that email exists, reset instructions have been sent" });
    }
    catch (err) {
        next(err);
    }
}
async function resetPassword(req, res, next) {
    try {
        const { token, newPassword } = req.body;
        await (0, authService_1.resetUserPassword)(token, newPassword);
        return res.status(200).json({ message: "Password reset successful" });
    }
    catch (err) {
        // Let the global AppError handler return the correct 400 status + message
        next(err);
    }
}
//# sourceMappingURL=authController.js.map