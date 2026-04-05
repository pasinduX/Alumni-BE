import { Request, Response, NextFunction } from "express";
import {
  registerUser,
  authenticateUser,
  verifyEmailToken,
  requestPasswordReset,
  resetUserPassword,
} from "../services/authService";
import { AppError } from "../utils/AppError";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    await registerUser(email, password, baseUrl);
    return res.status(201).json({ message: "Verification email sent" });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const token = String(req.query.token || "");
    if (!token) {
      return res.status(400).json({ error: "Token required" });
    }
    await verifyEmailToken(token);
    return res.redirect("/web/login?verified=1");
  } catch (err: any) {
    // Redirect to the appropriate error page instead of returning JSON
    if (err instanceof AppError && err.code === "INVALID_TOKEN") {
      return res.redirect("/web/login?verified=0&error=invalid_token");
    }
    if (err instanceof AppError && err.code === "TOKEN_EXPIRED") {
      return res.redirect("/web/login?verified=0&error=token_expired");
    }
    return next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials or unverified" });
    }
    const session = req.session as any;
    session.userId = user.id;
    session.role = user.role;
    session.email = email;
    return res.status(200).json({ message: "Logged in" });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    req.session.destroy((err: any) => {
      if (err) return next(err);
      return res.status(200).json({ message: "Logged out" });
    });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    await requestPasswordReset(email, baseUrl);
    return res.status(200).json({ message: "If that email exists, reset instructions have been sent" });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = req.body;
    await resetUserPassword(token, newPassword);
    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    // Let the global AppError handler return the correct 400 status + message
    next(err);
  }
}
