import { Router } from "express";
import { fetch } from "undici";
import multer from "multer";
import { requireLogin } from "../middleware/auth";
import { uploadImage } from "../controllers/profileController";

const router = Router();
const upload = multer({ dest: "uploads/", limits: { fileSize: 2 * 1024 * 1024 } });

const apiUrl = (req: any) => `${req.protocol}://${req.get("host")}`;

function toCookieHeader(req: any) {
  const cookies = req.headers.cookie;
  return cookies ? { Cookie: cookies } : {};
}

router.get("/login", (_req, res) => {
  res.render("auth/login", { messages: res.locals.messages || {}, title: "Login" });
});

router.get("/register", (_req, res) => {
  res.render("auth/register", { messages: res.locals.messages || {}, title: "Register" });
});

router.get("/profile/test", requireLogin, (_req, res) => {
  res.send("OK /web/profile/test");
});

router.get("/profile", requireLogin, async (req: any, res, next) => {
  try {
    const response = await fetch(`${apiUrl(req)}/profile`, {
      headers: { ...toCookieHeader(req) },
    });
    const profile = await response.json();
    res.render("profile/edit", { profile, messages: res.locals.messages || {}, title: "My Profile" });
  } catch (err) {
    next(err);
  }
});

router.post("/profile", requireLogin, async (req: any, res, next) => {
  try {
    await fetch(`${apiUrl(req)}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...toCookieHeader(req),
      },
      body: JSON.stringify(req.body),
    });
    req.flash("success", "Profile updated");
    res.redirect("/web/profile");
  } catch (err) {
    next(err);
  }
});

router.post("/profile/image", requireLogin, upload.single("image"), async (req: any, res, next) => {
  try {
    await uploadImage(req as any, res, next);
  } catch (err) {
    next(err);
  }
});

const sections = ["degrees", "certifications", "licences", "professional_courses", "employment_history"];

sections.forEach((section) => {
  const route = section === "professional_courses" ? "courses" : section === "employment_history" ? "employment" : section;

  router.get(`/profile/${route}`, requireLogin, async (req: any, res, next) => {
    try {
      const response = await fetch(`${apiUrl(req)}/profile`, { headers: toCookieHeader(req) });
      const profile = await response.json();
      res.render(`profile/${route}`, { profile, section, messages: res.locals.messages || {}, title: route.charAt(0).toUpperCase() + route.slice(1) });
    } catch (err) {
      next(err);
    }
  });

  router.post(`/profile/${route}`, requireLogin, async (req: any, res, next) => {
    try {
      await fetch(`${apiUrl(req)}/profile/${section}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...toCookieHeader(req),
        },
        body: JSON.stringify(req.body),
      });
      req.flash("success", `${route} entry added`);
      res.redirect(`/web/profile/${route}`);
    } catch (err) {
      next(err);
    }
  });

  router.post(`/profile/${route}/:id/delete`, requireLogin, async (req: any, res, next) => {
    try {
      await fetch(`${apiUrl(req)}/profile/${section}/${req.params.id}`, {
        method: "DELETE",
        headers: toCookieHeader(req),
      });
      req.flash("success", `${route} entry deleted`);
      res.redirect(`/web/profile/${route}`);
    } catch (err) {
      next(err);
    }
  });
});

router.get("/logout", requireLogin, async (req: any, res) => {
  await fetch(`${apiUrl(req)}/auth/logout`, { method: "POST", headers: toCookieHeader(req) });
  req.session.destroy(() => {
    res.redirect("/web/login");
  });
});

export default router;
