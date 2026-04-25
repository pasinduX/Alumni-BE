import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import session from "express-session";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import flash from "connect-flash";
import layouts from "express-ejs-layouts";
import swaggerUi from "swagger-ui-express";
import { config } from "./config";
import apiRouter from "./routes";
import webRouter from "./routes/webRoutes";
import universityRouter from "./routes/university";
import { globalLimiter, authLimiter, apiLimiter } from "./middleware/rateLimiter";
import { requestLogger } from "./middleware/logger";
import { swaggerSpec } from "./swagger";
import { startWinnerScheduler } from "./jobs/winnerSelector";
import { startMonthlyBidWinnerJob } from "./jobs/monthlyBidWinner";
import { AppError } from "./utils/AppError";

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(layouts);
app.set("layout", "layout");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
        fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
  }),
);
// CORS — only the university dashboard origin is permitted on /api and /university routes.
// All other origins are blocked by the absence of CORS headers.
app.use(
  cors({
    origin: config.universityDashboardOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(cookieParser());
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production" },
}));

// ── Rate limiting ───────────────────────────────────────────────────────────
// /auth  : strict limit — 10 requests per 15 minutes (brute-force protection)
// /api   : standard limit — 100 requests per 15 minutes
// everything else falls back to globalLimiter
app.use("/auth", authLimiter);
app.use("/api",  apiLimiter);
app.use(globalLimiter);

app.use(requestLogger);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// ── CSRF protection ─────────────────────────────────────────────────────────
// Applied only to web form routes (/web and /university).
// Pure JSON API routes (/auth, /api, /profile, etc.) are excluded.
app.use((req, res, next) => {
  const isWebRoute =
    req.path.startsWith("/web") || req.path.startsWith("/university");
  if (!isWebRoute) return next();
  return csurf({ cookie: true })(req, res, next);
});

app.use(morgan("tiny"));
app.use(flash());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));


app.use((req, res, next) => {
  const session = req.session as any;
  res.locals.user = session?.userId
    ? { userId: session.userId, role: session.role, email: session.email || null }
    : null;
  res.locals.messages = (req as any).flash ? (req as any).flash() : {};
  const fieldErrors = (req as any).flash ? (req as any).flash("fieldErrors") : [];
  res.locals.fieldErrors = fieldErrors.length ? JSON.parse(fieldErrors[0]) : {};
  res.locals.csrfToken = (req as any).csrfToken ? (req as any).csrfToken() : "";
  res.locals.currentPath = req.originalUrl.split('?')[0];
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/", (_req, res) => res.redirect("/web/login"));
app.use("/web", webRouter);
app.use("/university", universityRouter);
app.use("/", apiRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const safeFlash = typeof (req as any).flash === "function" ? (req as any).flash.bind(req) : () => {};

  if (err && err.code === "EBADCSRFTOKEN") {
    console.warn("CSRF token missing/invalid for", req.originalUrl);
    if (req.originalUrl.startsWith("/web")) {
      safeFlash("error", "Invalid CSRF token. Please refresh and retry.");
      return res.redirect("/web/login");
    }
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  if (err && err.code === "22P02") {
    console.warn("Invalid input syntax error", err.message);
    if (req.originalUrl.startsWith("/web")) {
      safeFlash("error", "Invalid date value. Please use YYYY-MM-DD or leave blank.");
      return res.redirect(req.originalUrl.startsWith("/web/") ? req.originalUrl : "/web/profile");
    }
    return res.status(400).json({ error: "Invalid input value" });
  }

  if (err instanceof AppError) {
    if (req.originalUrl.startsWith("/web")) {
      safeFlash("error", err.message);
      return res.redirect((req.headers.referer as string) || "/web/login");
    }
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error(err);
  if (req.originalUrl.startsWith("/web")) {
    safeFlash("error", "Unexpected server error. Please try again.");
    return res.redirect("/web/login");
  }
  res.status(err.status || 500).json({ error: err.message ?? "Internal server error" });
});

export default app;

export const startServer = () => {
  const port = config.port;
  app.listen(port, () => {
    console.log(`🚀 Server listening on http://localhost:${port}`);
    startWinnerScheduler();
    startMonthlyBidWinnerJob();
  });
};
