"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const bids_1 = __importDefault(require("./bids"));
const profiles_1 = __importDefault(require("./profiles"));
const router = (0, express_1.Router)();
router.use("/auth", auth_1.default);
router.use("/bids", bids_1.default);
router.use("/profiles", profiles_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map