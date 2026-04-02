"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireLogin = requireLogin;
exports.requireAdmin = requireAdmin;
function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    req.userId = req.session.userId;
    req.userRole = req.session.role;
    next();
}
function requireAdmin(req, res, next) {
    if (!req.session || req.session.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
    }
    next();
}
//# sourceMappingURL=auth.js.map