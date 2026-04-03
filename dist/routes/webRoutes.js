"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const undici_1 = require("undici");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const profileController_1 = require("../controllers/profileController");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: "uploads/", limits: { fileSize: 2 * 1024 * 1024 } });
const apiUrl = (req) => `${req.protocol}://${req.get("host")}`;
function toCookieHeader(req) {
    const cookies = req.headers.cookie;
    return cookies ? { Cookie: cookies } : {};
}
/** Flash API error messages extracted from a failed fetch response */
async function flashApiError(req, response, fallback = "Something went wrong") {
    try {
        const data = await response.json();
        const msg = data?.error || data?.message || fallback;
        req.flash("error", msg);
    }
    catch {
        req.flash("error", fallback);
    }
}
// ── Auth pages ──────────────────────────────────────────────────────────────
router.get("/login", (req, res) => {
    if (req.session?.userId)
        return res.redirect("/web/profile");
    res.render("auth/login", { messages: res.locals.messages || {}, title: "Sign in" });
});
router.get("/register", (req, res) => {
    if (req.session?.userId)
        return res.redirect("/web/profile");
    res.render("auth/register", { messages: res.locals.messages || {}, title: "Join" });
});
router.get("/forgot-password", (req, res) => {
    if (req.session?.userId)
        return res.redirect("/web/profile");
    res.render("auth/forgot-password", { messages: res.locals.messages || {}, title: "Forgot password" });
});
router.get("/reset-password", (_req, res) => {
    res.render("auth/reset-password", { messages: res.locals.messages || {}, title: "Reset password" });
});
// ── Logout ──────────────────────────────────────────────────────────────────
router.post("/logout", auth_1.requireLogin, async (req, res) => {
    try {
        await (0, undici_1.fetch)(`${apiUrl(req)}/auth/logout`, { method: "POST", headers: toCookieHeader(req) });
    }
    catch { /* ignore */ }
    req.session.destroy(() => res.redirect("/web/login"));
});
// Keep the GET logout as a convenience (e.g. direct navigation)
router.get("/logout", auth_1.requireLogin, async (req, res) => {
    try {
        await (0, undici_1.fetch)(`${apiUrl(req)}/auth/logout`, { method: "POST", headers: toCookieHeader(req) });
    }
    catch { /* ignore */ }
    req.session.destroy(() => res.redirect("/web/login"));
});
// ── Profile overview ─────────────────────────────────────────────────────────
router.get("/profile/test", auth_1.requireLogin, (_req, res) => {
    res.send("OK /web/profile/test");
});
router.get("/profile", auth_1.requireLogin, async (req, res, next) => {
    try {
        const response = await (0, undici_1.fetch)(`${apiUrl(req)}/profile`, {
            headers: { ...toCookieHeader(req) },
        });
        if (!response.ok) {
            await flashApiError(req, response, "Could not load profile");
            return res.redirect("/web/login");
        }
        const profile = await response.json();
        res.render("profile/profile", { profile, messages: res.locals.messages || {}, title: "My Profile" });
    }
    catch (err) {
        next(err);
    }
});
router.post("/profile", auth_1.requireLogin, async (req, res, next) => {
    try {
        const response = await (0, undici_1.fetch)(`${apiUrl(req)}/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...toCookieHeader(req) },
            body: JSON.stringify(req.body),
        });
        if (!response.ok) {
            await flashApiError(req, response, "Profile update failed");
        }
        else {
            req.flash("success", "Profile updated successfully");
        }
        res.redirect("/web/profile");
    }
    catch (err) {
        next(err);
    }
});
// ── Profile image upload ─────────────────────────────────────────────────────
router.post("/profile/image", auth_1.requireLogin, upload.single("image"), async (req, res, next) => {
    try {
        await (0, profileController_1.uploadImage)(req, res, next);
        // uploadImage handles the response; if we reach here redirect gracefully
    }
    catch (err) {
        req.flash("error", "Image upload failed");
        res.redirect("/web/profile");
    }
});
// ── Credential sections ──────────────────────────────────────────────────────
const sections = ["degrees", "certifications", "licences", "professional_courses", "employment_history"];
sections.forEach((section) => {
    const route = section === "professional_courses" ? "courses" :
        section === "employment_history" ? "employment" :
            section;
    router.get(`/profile/${route}`, auth_1.requireLogin, async (req, res, next) => {
        try {
            const response = await (0, undici_1.fetch)(`${apiUrl(req)}/profile`, { headers: toCookieHeader(req) });
            if (!response.ok) {
                await flashApiError(req, response, "Could not load profile data");
                return res.redirect("/web/profile");
            }
            const profile = await response.json();
            const pageTitle = route.charAt(0).toUpperCase() + route.slice(1);
            res.render(`profile/${route}`, { profile, section, messages: res.locals.messages || {}, title: pageTitle });
        }
        catch (err) {
            next(err);
        }
    });
    router.post(`/profile/${route}`, auth_1.requireLogin, async (req, res, next) => {
        try {
            const response = await (0, undici_1.fetch)(`${apiUrl(req)}/profile/${section}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...toCookieHeader(req) },
                body: JSON.stringify(req.body),
            });
            if (!response.ok) {
                await flashApiError(req, response, `Failed to add ${route} entry`);
            }
            else {
                req.flash("success", "Entry added successfully");
            }
            res.redirect(`/web/profile/${route}`);
        }
        catch (err) {
            next(err);
        }
    });
    router.post(`/profile/${route}/:id/delete`, auth_1.requireLogin, async (req, res, next) => {
        try {
            const response = await (0, undici_1.fetch)(`${apiUrl(req)}/profile/${section}/${req.params.id}`, {
                method: "DELETE",
                headers: toCookieHeader(req),
            });
            if (!response.ok) {
                await flashApiError(req, response, `Failed to delete ${route} entry`);
            }
            else {
                req.flash("success", "Entry removed");
            }
            res.redirect(`/web/profile/${route}`);
        }
        catch (err) {
            next(err);
        }
    });
});
exports.default = router;
//# sourceMappingURL=webRoutes.js.map