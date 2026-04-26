"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    constructor(statusCode, message, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = "AppError";
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
//# sourceMappingURL=AppError.js.map