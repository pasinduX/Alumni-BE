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
        servers: [{ url: "http://localhost:4000" }],
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
            },
        },
    },
    apis: ["./src/routes/*.ts"],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
//# sourceMappingURL=swagger.js.map