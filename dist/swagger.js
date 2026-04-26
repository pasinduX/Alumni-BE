"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "AR Alumni Influencer Platform API",
            version: "1.0.0",
            description: "API documentation for AR Alumni Influencer Platform",
        },
        servers: [
            { url: "http://localhost:8000", description: "Kong Gateway" },
            { url: "http://localhost:3000", description: "Docker (direct)" },
            { url: "http://localhost:4000", description: "Local dev" },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
                sessionAuth: {
                    type: "apiKey",
                    in: "cookie",
                    name: "connect.sid",
                },
                csrfToken: {
                    type: "apiKey",
                    in: "header",
                    name: "x-csrf-token",
                    description: "CSRF token — fetch from GET /auth/csrf-token first",
                },
            },
        },
    },
    apis: ["./src/routes/*.ts"],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
//# sourceMappingURL=swagger.js.map