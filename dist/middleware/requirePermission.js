"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = requirePermission;
function requirePermission(permission) {
    return (req, res, next) => {
        const permissions = req.apiKey?.permissions;
        const allowed = Array.isArray(permissions) && permissions.includes(permission);
        if (!allowed) {
            res.status(403).json({ error: "Insufficient permissions" });
            return;
        }
        next();
    };
}
//# sourceMappingURL=requirePermission.js.map