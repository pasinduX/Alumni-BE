import { Router } from "express";
import multer from "multer";
import { requireLogin } from "../middleware/auth";
import { body } from "express-validator";
import {
  getProfile,
  updateProfile,
  uploadImage,
  completion,
  createSectionEntry,
  updateSectionEntry,
  deleteSectionEntry,
  setAttendance,
} from "../controllers/profileController";
import { handleValidationErrors } from "../middleware/validate";

const router = Router();
const upload = multer({ dest: "uploads/", limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") cb(null, true);
  else cb(new Error("Only JPEG/PNG images are allowed"));
}});

router.get("/profile", requireLogin, getProfile);

router.put(
  "/profile",
  requireLogin,
  body("linkedin_url")
    .optional({ checkFalsy: true })
    .custom((val) => {
      const normalized = val.startsWith("http") ? val : `https://${val}`;
      if (!/^https?:\/\/(www\.)?linkedin\.com\/in\//i.test(normalized)) {
        throw new Error("LinkedIn URL must be on linkedin.com/in/...");
      }
      return true;
    }),
  handleValidationErrors,
  updateProfile,
);
router.post("/profile/image", requireLogin, upload.single("image"), uploadImage);
router.get("/profile/completion", requireLogin, completion);

router.post("/profile/:section", requireLogin, handleValidationErrors, createSectionEntry);
router.put("/profile/:section/:id", requireLogin, handleValidationErrors, updateSectionEntry);
router.delete("/profile/:section/:id", requireLogin, deleteSectionEntry);

router.put("/profile/event-attendance", requireLogin, setAttendance);

export default router;
