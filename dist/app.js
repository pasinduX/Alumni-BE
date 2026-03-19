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
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const yamljs_1 = __importDefault(require("yamljs"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
const swaggerDocument = yamljs_1.default.load("./src/docs/openapi.yaml");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)("tiny"));
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "..", "uploads")));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", routes_1.default);
app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument, { explorer: true }));
// Generic error handler
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message ?? "Internal server error" });
});
exports.default = app;
const startServer = () => {
    const port = config_1.config.port;
    app.listen(port, () => {
        console.log(`🚀 Server listening on http://localhost:${port}`);
    });
};
exports.startServer = startServer;
//# sourceMappingURL=app.js.map