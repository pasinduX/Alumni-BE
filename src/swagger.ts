import swaggerJSDoc from "swagger-jsdoc";

const swaggerOptions: swaggerJSDoc.Options = {
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
    security: [
      { csrfToken: [] },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
