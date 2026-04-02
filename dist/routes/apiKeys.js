"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const apiKeysController_1 = require("../controllers/apiKeysController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
router.post("/developer/keys/generate", auth_1.requireLogin, (0, express_validator_1.body)("label").notEmpty(), validate_1.handleValidationErrors, apiKeysController_1.generateKey);
router.get("/developer/keys", auth_1.requireLogin, apiKeysController_1.listKeys);
router.get("/developer/keys/:id/stats", auth_1.requireLogin, apiKeysController_1.keyStats);
router.delete("/developer/keys/:id/revoke", auth_1.requireLogin, apiKeysController_1.revokeKey);
exports.default = router;
//# sourceMappingURL=apiKeys.js.map