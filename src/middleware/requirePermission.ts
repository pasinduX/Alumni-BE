
import { Response, NextFunction } from "express";
import { ApiKeyRequest } from "./requireApiKey";

export function requirePermission(permission: string) {
  return (req: ApiKeyRequest, res: Response, next: NextFunction): void => {
    const permissions = req.apiKey?.permissions;

    const allowed =
      Array.isArray(permissions) && permissions.includes(permission);

    if (!allowed) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
}
