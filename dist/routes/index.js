"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const bids_1 = __importDefault(require("./bids"));
const profiles_1 = __importDefault(require("./profiles"));
const apiKeys_1 = __importDefault(require("./apiKeys"));
const public_1 = __importDefault(require("./public"));
const router = (0, express_1.Router)();
router.use("/auth", auth_1.default);
router.use("", bids_1.default);
router.use("", profiles_1.default);
router.use("", apiKeys_1.default);
router.use("", public_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map