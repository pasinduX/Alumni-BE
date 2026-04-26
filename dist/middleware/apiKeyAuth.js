"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = apiKeyAuth;
const crypto_1 = __importDefault(require("crypto"));
const apiKeyModel = __importStar(require("../models/apiKeyModel"));
async function apiKeyAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (!token) {
        return res.status(401).json({ error: "Invalid or revoked API key" });
    }
    try {
        const keyHash = crypto_1.default.createHash("sha256").update(token).digest("hex");
        const key = await apiKeyModel.findActiveApiKeyByHash(keyHash);
        if (!key) {
            return res.status(401).json({ error: "Invalid or revoked API key" });
        }
        req.apiKeyId = key.id;
        req.apiUserId = key.user_id;
        apiKeyModel.touchApiKey(key.id).catch(() => { });
        apiKeyModel.logApiKeyAccess(key.id, req.originalUrl, req.method, 200).catch(() => { });
        return next();
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=apiKeyAuth.js.map