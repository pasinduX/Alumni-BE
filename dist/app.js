"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_session_1 = __importDefault(require("express-session"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const csurf_1 = __importDefault(require("csurf"));
const connect_flash_1 = __importDefault(require("connect-flash"));
const express_ejs_layouts_1 = __importDefault(require("express-ejs-layouts"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
const webRoutes_1 = __importDefault(require("./routes/webRoutes"));
const university_1 = __importDefault(require("./routes/university"));
const rateLimiter_1 = require("./middleware/rateLimiter");
const logger_1 = require("./middleware/logger");
const swagger_1 = require("./swagger");
const winnerSelector_1 = require("./jobs/winnerSelector");
const monthlyBidWinner_1 = require("./jobs/monthlyBidWinner");
const AppError_1 = require("./utils/AppError");
const app = (0, express_1.default)();
app.set("view engine", "ejs");
app.set("views", path_1.default.join(__dirname, "..", "views"));
app.use(express_ejs_layouts_1.default);
app.set("layout", "layout");
app.use((0, helmet_1.default)({
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
}));
// CORS — only the university dashboard origin is permitted on /api and /university routes.
// All other origins are blocked by the absence of CORS headers.
app.use((0, cors_1.default)({
    origin: config_1.config.universityDashboardOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use((0, cookie_parser_1.default)());
app.use((0, express_session_1.default)({
    secret: config_1.config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production" },
}));
// ── Rate limiting ───────────────────────────────────────────────────────────
// /auth  : strict limit — 10 requests per 15 minutes (brute-force protection)
// /api   : standard limit — 100 requests per 15 minutes
// everything else falls back to globalLimiter
app.use("/auth", rateLimiter_1.authLimiter);
app.use("/api", rateLimiter_1.apiLimiter);
app.use(rateLimiter_1.globalLimiter);
app.use(logger_1.requestLogger);
app.use(express_1.default.json({ limit: "10kb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// ── CSRF protection ─────────────────────────────────────────────────────────
// Applied only to web form routes (/web and /university).
// Pure JSON API routes (/auth, /api, /profile, etc.) are excluded.
app.use((req, res, next) => {
    const isWebRoute = req.path.startsWith("/web") || req.path.startsWith("/university");
    if (!isWebRoute)
        return next();
    return (0, csurf_1.default)({ cookie: true })(req, res, next);
});
app.use((0, morgan_1.default)("tiny"));
app.use((0, connect_flash_1.default)());
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "..", "uploads")));
app.use((req, res, next) => {
    const session = req.session;
    res.locals.user = session?.userId
        ? { userId: session.userId, role: session.role, email: session.email || null }
        : null;
    res.locals.messages = req.flash ? req.flash() : {};
    const fieldErrors = req.flash ? req.flash("fieldErrors") : [];
    res.locals.fieldErrors = fieldErrors.length ? JSON.parse(fieldErrors[0]) : {};
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : "";
    res.locals.currentPath = req.originalUrl.split('?')[0];
    next();
});
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/", (_req, res) => res.redirect("/web/login"));
app.use("/web", webRoutes_1.default);
app.use("/university", university_1.default);
app.use("/", routes_1.default);
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
app.use((err, req, res, next) => {
    const safeFlash = typeof req.flash === "function" ? req.flash.bind(req) : () => { };
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
    if (err instanceof AppError_1.AppError) {
        if (req.originalUrl.startsWith("/web")) {
            safeFlash("error", err.message);
            return res.redirect(req.headers.referer || "/web/login");
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
exports.default = app;
const startServer = () => {
    const port = config_1.config.port;
    app.listen(port, () => {
        console.log(`🚀 Server listening on http://localhost:${port}`);
        (0, winnerSelector_1.startWinnerScheduler)();
        (0, monthlyBidWinner_1.startMonthlyBidWinnerJob)();
    });
};
exports.startServer = startServer;
//# sourceMappingURL=app.js.map