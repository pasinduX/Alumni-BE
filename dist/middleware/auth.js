"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireLogin = requireLogin;
exports.requireRole = requireRole;
exports.requireAdmin = requireAdmin;
function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
        if (req.originalUrl.startsWith("/web")) {
            return res.redirect("/web/login");
        }
        return res.status(401).json({ error: "Unauthorized" });
    }
    req.userId = req.session.userId;
    req.userRole = req.session.role;
    next();
}
function requireRole(role) {
    return (req, res, next) => {
        if (!req.session || !req.session.userId) {
            if (req.originalUrl.startsWith("/web")) {
                return res.redirect("/web/login");
            }
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (req.session.role !== role) {
            if (req.originalUrl.startsWith("/web")) {
                return res.redirect("/web/login");
            }
            return res.status(403).json({ error: "Forbidden" });
        }
        req.userId = req.session.userId;
        req.userRole = req.session.role;
        next();
    };
}
function requireAdmin(req, res, next) {
    if (!req.session || req.session.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
    }
    next();
}
//# sourceMappingURL=auth.js.map