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
router.get("/login", (_req, res) => {
    res.render("auth/login", { messages: res.locals.messages || {}, title: "Login" });
});
router.get("/register", (_req, res) => {
    res.render("auth/register", { messages: res.locals.messages || {}, title: "Register" });
});
router.get("/profile/test", auth_1.requireLogin, (_req, res) => {
    res.send("OK /web/profile/test");
});
router.get("/profile", auth_1.requireLogin, async (req, res, next) => {
    try {
        const response = await (0, undici_1.fetch)(`${apiUrl(req)}/profile`, {
            headers: { ...toCookieHeader(req) },
        });
        const profile = await response.json();
        res.render("profile/edit", { profile, messages: res.locals.messages || {}, title: "My Profile" });
    }
    catch (err) {
        next(err);
    }
});
router.post("/profile", auth_1.requireLogin, async (req, res, next) => {
    try {
        await (0, undici_1.fetch)(`${apiUrl(req)}/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...toCookieHeader(req),
            },
            body: JSON.stringify(req.body),
        });
        req.flash("success", "Profile updated");
        res.redirect("/web/profile");
    }
    catch (err) {
        next(err);
    }
});
router.post("/profile/image", auth_1.requireLogin, upload.single("image"), async (req, res, next) => {
    try {
        await (0, profileController_1.uploadImage)(req, res, next);
    }
    catch (err) {
        next(err);
    }
});
const sections = ["degrees", "certifications", "licences", "professional_courses", "employment_history"];
sections.forEach((section) => {
    const route = section === "professional_courses" ? "courses" : section === "employment_history" ? "employment" : section;
    router.get(`/profile/${route}`, auth_1.requireLogin, async (req, res, next) => {
        try {
            const response = await (0, undici_1.fetch)(`${apiUrl(req)}/profile`, { headers: toCookieHeader(req) });
            const profile = await response.json();
            res.render(`profile/${route}`, { profile, section, messages: res.locals.messages || {}, title: route.charAt(0).toUpperCase() + route.slice(1) });
        }
        catch (err) {
            next(err);
        }
    });
    router.post(`/profile/${route}`, auth_1.requireLogin, async (req, res, next) => {
        try {
            await (0, undici_1.fetch)(`${apiUrl(req)}/profile/${section}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...toCookieHeader(req),
                },
                body: JSON.stringify(req.body),
            });
            req.flash("success", `${route} entry added`);
            res.redirect(`/web/profile/${route}`);
        }
        catch (err) {
            next(err);
        }
    });
    router.post(`/profile/${route}/:id/delete`, auth_1.requireLogin, async (req, res, next) => {
        try {
            await (0, undici_1.fetch)(`${apiUrl(req)}/profile/${section}/${req.params.id}`, {
                method: "DELETE",
                headers: toCookieHeader(req),
            });
            req.flash("success", `${route} entry deleted`);
            res.redirect(`/web/profile/${route}`);
        }
        catch (err) {
            next(err);
        }
    });
});
router.get("/logout", auth_1.requireLogin, async (req, res) => {
    await (0, undici_1.fetch)(`${apiUrl(req)}/auth/logout`, { method: "POST", headers: toCookieHeader(req) });
    req.session.destroy(() => {
        res.redirect("/web/login");
    });
});
exports.default = router;
//# sourceMappingURL=webRoutes.js.map