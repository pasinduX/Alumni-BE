"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleValidationErrors = handleValidationErrors;
const express_validator_1 = require("express-validator");
function handleValidationErrors(req, res, next) {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorObj = errors.array().reduce((acc, err) => {
            if ('param' in err && typeof err.param === 'string') {
                acc[err.param] = err.msg;
            }
            else {
                acc['error'] = err.msg;
            }
            return acc;
        }, {});
        return res.status(400).json({
            message: "Validation failed",
            errors: errorObj,
        });
    }
    next();
}
//# sourceMappingURL=validate.js.map