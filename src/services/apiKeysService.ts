import bcrypt from "bcrypt";
import crypto from "crypto";
import { AppError } from "../utils/AppError";
import * as apiKeyModel from "../models/apiKeyModel";

const SALT_ROUNDS = 12;

export async function generateApiKey(userId: string, label: string) {
  const plainKey = `ak_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = await bcrypt.hash(plainKey, SALT_ROUNDS);
  const row = await apiKeyModel.createApiKey(userId, keyHash, label);
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
