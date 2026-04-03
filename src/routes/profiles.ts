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

/**
 * @openapi
 * /profile:
 *   get:
 *     summary: Get current user profile details
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Profile data
 *       401:
 *         description: Unauthorized
 */
router.get("/profile", requireLogin, getProfile);

/**
 * @openapi
 * /profile:
 *   put:
 *     summary: Update profile details
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               bio:
 *                 type: string
 *               linkedin_url:
 *                 type: string
 *               phone_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
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
  body("phone_number")
    .optional({ checkFalsy: true })
    .matches(/^(\+44\s?7\d{3}|07\d{3})\s?\d{3}\s?\d{3}$/)
    .withMessage("UK phone number must be in +44 7XXX XXX XXX or 07XXX XXX XXX format."),
  handleValidationErrors,
  updateProfile,
);/**
 * @openapi
 * /profile/image:
 *   post:
 *     summary: Upload profile image
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded
 */
router.post("/profile/image", requireLogin, upload.single("image"), uploadImage);

/**
 * @openapi
 * /profile/completion:
 *   get:
 *     summary: Profile completion percentage
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Completion object
 */
router.get("/profile/completion", requireLogin, completion);

/**
 * @openapi
 * /profile/{section}:
 *   post:
 *     summary: Add section entry (degrees, certifications, etc.)
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [degrees, certifications, licences, professional_courses, employment_history]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Entry created
 */
router.post("/profile/:section", requireLogin, handleValidationErrors, createSectionEntry);
/**
 * @openapi
 * /profile/{section}/{id}:
 *   put:
 *     summary: Update section entry
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Entry updated
 */
router.put("/profile/:section/:id", requireLogin, handleValidationErrors, updateSectionEntry);

/**
 * @openapi
 * /profile/{section}/{id}:
 *   delete:
 *     summary: Delete section entry
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Entry deleted
 */
router.delete("/profile/:section/:id", requireLogin, deleteSectionEntry);

/**
 * @openapi
 * /profile/event-attendance:
 *   put:
 *     summary: Set event attendance for profile
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               attended:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Attendance updated
 */
router.put("/profile/event-attendance", requireLogin, setAttendance);

export default router;
