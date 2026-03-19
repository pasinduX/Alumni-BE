"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
router.post("/register", (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"), (0, express_validator_1.body)("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"), async (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const body = req.body;
    try {
        const user = await (0, authController_1.registerUser)(body.email, body.password);
        return res.status(201).json({ id: user.id, email: user.email });
    }
    catch (err) {
        next(err);
    }
});
router.post("/login", (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"), (0, express_validator_1.body)("password").notEmpty().withMessage("Password is required"), async (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const body = req.body;
    try {
        const token = await (0, authController_1.loginUser)(body.email, body.password);
        return res.json({ token });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map