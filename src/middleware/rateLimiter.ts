import rateLimit from "express-rate-limit";

/** Global fallback limiter (kept for any routes not covered by specific limiters). */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

/** Applied to all /api routes — 200 requests per 15 minutes. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many API requests. Please slow down." },
});

/** Applied to /auth routes — 20 requests per 15 minutes. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please wait 15 minutes and try again." },
});
