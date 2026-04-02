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
const rateLimiter_1 = require("./middleware/rateLimiter");
const logger_1 = require("./middleware/logger");
const swagger_1 = require("./swagger");
const winnerSelector_1 = require("./jobs/winnerSelector");
const app = (0, express_1.default)();
app.set("view engine", "ejs");
app.set("views", path_1.default.join(__dirname, "..", "views"));
app.use(express_ejs_layouts_1.default);
app.set("layout", "layout");
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.config.allowedOrigins,
    credentials: true,
}));
app.use((0, cookie_parser_1.default)());
app.use((0, express_session_1.default)({
    secret: config_1.config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production" },
}));
app.use((0, csurf_1.default)({ cookie: true }));
app.use(rateLimiter_1.globalLimiter);
app.use(logger_1.requestLogger);
app.use(express_1.default.json({ limit: "10kb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)("tiny"));
app.use((0, connect_flash_1.default)());
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "..", "uploads")));
app.use((req, res, next) => {
    const session = req.session;
    res.locals.user = session?.userId ? { userId: session.userId, role: session.role } : null;
    res.locals.messages = req.flash ? req.flash() : {};
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : "";
    next();
});
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/web", webRoutes_1.default);
app.use("/", routes_1.default);
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message ?? "Internal server error" });
});
exports.default = app;
const startServer = () => {
    const port = config_1.config.port;
    app.listen(port, () => {
        console.log(`🚀 Server listening on http://localhost:${port}`);
        (0, winnerSelector_1.startWinnerScheduler)();
    });
};
exports.startServer = startServer;
//# sourceMappingURL=app.js.map