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
import { globalLimiter } from "./middleware/rateLimiter";
import { requestLogger } from "./middleware/logger";
import { swaggerSpec } from "./swagger";
import { startWinnerScheduler } from "./jobs/winnerSelector";

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(layouts);
app.set("layout", "layout");

app.use(helmet());
app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production" },
}));
app.use(csurf({ cookie: true }));
app.use(globalLimiter);
app.use(requestLogger);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("tiny"));
app.use(flash());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));


app.use((req, res, next) => {
  const session = req.session as any;
  res.locals.user = session?.userId ? { userId: session.userId, role: session.role } : null;
  res.locals.messages = (req as any).flash ? (req as any).flash() : {};
  res.locals.csrfToken = (req as any).csrfToken ? (req as any).csrfToken() : "";
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/web", webRouter);
app.use("/", apiRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message ?? "Internal server error" });
});

export default app;

export const startServer = () => {
  const port = config.port;
  app.listen(port, () => {
    console.log(`🚀 Server listening on http://localhost:${port}`);
    startWinnerScheduler();
  });
};
