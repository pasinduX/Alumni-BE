import { Router } from "express";
import authRouter from "./auth";
import bidsRouter from "./bids";
import profilesRouter from "./profiles";
import apiKeysRouter from "./apiKeys";
import publicRouter from "./public";

const router = Router();

router.use("/auth", authRouter);
router.use("", bidsRouter);
router.use("", profilesRouter);
router.use("", apiKeysRouter);
router.use("", publicRouter);

export default router;
