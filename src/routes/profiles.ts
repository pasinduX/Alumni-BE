import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { getMyProfile, updateMyProfile, uploadProfileImage } from "../controllers/profileController";

const router = Router();
const upload = multer({ dest: "uploads/" });

router.get("/me", requireAuth, getMyProfile);
router.put("/me", requireAuth, updateMyProfile);
router.post("/me/avatar", requireAuth, upload.single("avatar"), uploadProfileImage);

export default router;
