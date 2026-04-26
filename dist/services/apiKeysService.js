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
exports.generateApiKey = generateApiKey;
exports.listApiKeys = listApiKeys;
exports.getApiKeyStats = getApiKeyStats;
exports.revokeApiKey = revokeApiKey;
const crypto_1 = __importDefault(require("crypto"));
const AppError_1 = require("../utils/AppError");
const apiKeyModel = __importStar(require("../models/apiKeyModel"));
async function generateApiKey(userId, clientName, permissions = []) {
    const plainKey = crypto_1.default.randomBytes(32).toString("hex");
    const keyHash = crypto_1.default.createHash("sha256").update(plainKey).digest("hex");
    const row = await apiKeyModel.createApiKey(userId, keyHash, clientName, permissions);
    return { key: plainKey, ...row };
}
async function listApiKeys(userId) {
    return apiKeyModel.findApiKeysByUser(userId);
}
async function getApiKeyStats(userId, apiKeyId) {
    const key = await apiKeyModel.findApiKeyById(apiKeyId, userId);
    if (!key)
        throw new AppError_1.AppError(404, "API key not found");
    const logs = await apiKeyModel.findKeyLogs(apiKeyId);
    return { ...key, logs };
}
async function revokeApiKey(userId, apiKeyId) {
    const ok = await apiKeyModel.revokeApiKey(apiKeyId, userId);
    if (!ok)
        throw new AppError_1.AppError(404, "API key not found");
}
//# sourceMappingURL=apiKeysService.js.map