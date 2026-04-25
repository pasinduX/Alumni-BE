import crypto from "crypto";
import { AppError } from "../utils/AppError";
import * as apiKeyModel from "../models/apiKeyModel";

export async function generateApiKey(
  userId: string,
  clientName: string,
  permissions: string[] = []
) {
  const plainKey = crypto.randomBytes(32).toString("hex");
  const keyHash = crypto.createHash("sha256").update(plainKey).digest("hex");
  const row = await apiKeyModel.createApiKey(userId, keyHash, clientName, permissions);
  return { key: plainKey, ...row };
}

export async function listApiKeys(userId: string) {
  return apiKeyModel.findApiKeysByUser(userId);
}

export async function getApiKeyStats(userId: string, apiKeyId: string) {
  const key = await apiKeyModel.findApiKeyById(apiKeyId, userId);
  if (!key) throw new AppError(404, "API key not found");
  const logs = await apiKeyModel.findKeyLogs(apiKeyId);
  return { ...key, logs };
}

export async function revokeApiKey(userId: string, apiKeyId: string) {
  const ok = await apiKeyModel.revokeApiKey(apiKeyId, userId);
  if (!ok) throw new AppError(404, "API key not found");
}
