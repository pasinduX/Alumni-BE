import { Router } from "express";
import authRouter from "./auth";
import bidsRouter from "./bids";
import profilesRouter from "./profiles";

const router = Router();

router.use("/auth", authRouter);
router.use("/bids", bidsRouter);
router.use("/profiles", profilesRouter);

export default router;
