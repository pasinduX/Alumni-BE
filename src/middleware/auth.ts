import { Request, Response, NextFunction } from "express";

export interface SessionRequest extends Request {
  session: any;
  userId?: string;
  userRole?: string;
}

export function requireLogin(req: SessionRequest, res: Response, next: NextFunction) {
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

export function requireRole(role: string) {
  return (req: SessionRequest, res: Response, next: NextFunction) => {
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

export function requireAdmin(req: SessionRequest, res: Response, next: NextFunction) {
  if (!req.session || req.session.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
