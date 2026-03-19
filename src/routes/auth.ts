import { Router } from "express";
import { body, validationResult } from "express-validator";
import type { RegisterRequest, LoginRequest, AuthResponse } from "../types/api";
import { registerUser, loginUser } from "../controllers/authController";

const router = Router();

router.post(
  "/register",
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const body = req.body as RegisterRequest;

    try {
      const user = await registerUser(body.email, body.password);
      return res.status(201).json({ id: user.id, email: user.email });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/login",
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const body = req.body as LoginRequest;

    try {
      const token = await loginUser(body.email, body.password);
      return res.json({ token } as AuthResponse);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
