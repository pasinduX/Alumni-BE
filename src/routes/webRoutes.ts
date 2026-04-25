import { Router } from "express";
import { fetch } from "undici";
import multer from "multer";
import { requireLogin } from "../middleware/auth";

const router = Router();
const upload = multer({ dest: "uploads/", limits: { fileSize: 2 * 1024 * 1024 } });

const apiUrl = (req: any) => `${req.protocol}://${req.get("host")}`;

function toCookieHeader(req: any) {
  const cookies = req.headers.cookie;
  return cookies ? { Cookie: cookies } : {};
}

async function flashApiError(req: any, response: any, fallback = "Something went wrong") {
  try {
    const data: any = await response.json();
    if (response.status === 400 && data?.errors) {
      req.flash("fieldErrors", JSON.stringify(data.errors));
      const msg = data?.error || data?.message || "Validation failed";
      req.flash("error", msg);
      return;
    }
    const msg = data?.error || data?.message || fallback;
    req.flash("error", msg);
  } catch {
    req.flash("error", fallback);
  }
}

function handleUnauthorized(req: any, res: any, response: any) {
  if (response.status === 401) {
    req.flash("error", "Unauthorized. Please sign in again.");
    return res.redirect("/web/login");
  }
  return null;
}

router.get("/login", (req: any, res) => {
  if (req.query.email || req.query.password || req.query._csrf) {
    return res.redirect("/web/login");
  }
  if (req.session?.userId) return res.redirect("/web/profile");

  const messages = { ...(res.locals.messages || {}) };
  if (req.query.verified === "1") {
    messages.success = ["Email verified successfully. You can now log in."];
  } else if (req.query.verified === "0") {
    if (req.query.error === "token_expired") {
      messages.error = ["Verification link expired. Please request a new verification email."];
    } else {
      messages.error = ["Invalid verification link. Please check your email and try again."];
    }
  }

  res.render("auth/login", { messages, title: "Sign in" });
});

router.get("/register", (req: any, res) => {
  if (req.session?.userId) return res.redirect("/web/profile");
  res.render("auth/register", { messages: res.locals.messages || {}, title: "Join" });
});

router.get("/forgot-password", (req: any, res) => {
  if (req.session?.userId) return res.redirect("/web/profile");
  res.render("auth/forgot-password", { messages: res.locals.messages || {}, title: "Forgot password" });
});

router.get("/reset-password", (_req, res) => {
  res.render("auth/reset-password", { messages: res.locals.messages || {}, title: "Reset password" });
});


router.post("/logout", requireLogin, async (req: any, res) => {
  try {
    await fetch(`${apiUrl(req)}/auth/logout`, { method: "POST", headers: toCookieHeader(req) });
  } catch { }
  req.session.destroy(() => res.redirect("/web/login"));
});

router.get("/logout", requireLogin, async (req: any, res) => {
  try {
    await fetch(`${apiUrl(req)}/auth/logout`, { method: "POST", headers: toCookieHeader(req) });
  } catch { /* ignore */ }
  req.session.destroy(() => res.redirect("/web/login"));
});


router.get("/profile/test", requireLogin, (_req, res) => {
  res.send("OK /web/profile/test");
});

router.get("/profile", requireLogin, async (req: any, res, next) => {
  try {
    const response = await fetch(`${apiUrl(req)}/profile`, {
      headers: { ...toCookieHeader(req) },
    });
    const redirect = handleUnauthorized(req, res, response);
    if (redirect) return redirect;

    const now = new Date();
    const bidMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let bid: any = null;
    let isMonthlyWinner = false;

    try {
      const { query } = await import("../config/db");
      const profileRow = await query("SELECT id FROM alumni_profiles WHERE user_id = $1", [req.session.userId]);
      if (profileRow.rows[0]) {
        const alumniId = profileRow.rows[0].id;
        const bidResult = await query(
          "SELECT id, amount, bid_month, is_winner FROM monthly_bids WHERE alumni_id = $1 AND bid_month = $2 ORDER BY created_at DESC LIMIT 1",
          [alumniId, bidMonth],
        );
        bid = bidResult.rows[0] || null;
        isMonthlyWinner = bid?.is_winner === true;
      }
    } catch (_e) { /* non-fatal */ }

    if (response.status === 404) {
      return res.render("profile/profile", {
        profile: {},
        bid: null,
        isMonthlyWinner: false,
        bidMonth,
        messages: { ...(res.locals.messages || {}), info: "No profile yet. Fill in your details to get started." },
        title: "My Profile",
      });
    }
    if (!response.ok) {
      await flashApiError(req, response, "Could not load profile");
      return res.redirect("/web/login");
    }
    const profile = await response.json();
    res.render("profile/profile", { profile, bid, isMonthlyWinner, bidMonth, messages: res.locals.messages || {}, title: "My Profile" });
  } catch (err) {
    next(err);
  }
});

router.post("/profile", requireLogin, async (req: any, res, next) => {
  try {
    const response = await fetch(`${apiUrl(req)}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...toCookieHeader(req) },
      body: JSON.stringify(req.body),
    });
    if (!response.ok) {
      await flashApiError(req, response, "Profile update failed");
    } else {
      req.flash("success", "Profile updated successfully");
    }
    res.redirect("/web/profile");
  } catch (err) {
    next(err);
  }
});


router.post("/profile/image", requireLogin, upload.single("image"), async (req: any, res) => {
  try {
    if (!req.file) {
      req.flash("error", "Please select an image file");
      return res.redirect("/web/profile");
    }
    const { query } = await import("../config/db");
    const profileImageUrl = `/uploads/${req.file.filename}`;

    await query(
      `INSERT INTO alumni_profiles (user_id, profile_image_url, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET profile_image_url = EXCLUDED.profile_image_url, updated_at = NOW()`,
      [req.session.userId, profileImageUrl],
    );

    req.flash("success", "Profile photo updated");
    res.redirect("/web/profile");
  } catch (err) {
    req.flash("error", "Image upload failed");
    res.redirect("/web/profile");
  }
});


// ─── Monthly bid ──────────────────────────────────────────────────────────────

router.get("/profile/bid", requireLogin, async (req: any, res, next) => {
  try {
    const { query } = await import("../config/db");
    const userId: string = req.session.userId;

    const profileRow = await query("SELECT id FROM alumni_profiles WHERE user_id = $1", [userId]);
    if (!profileRow.rows[0]) {
      req.flash("error", "Profile not found. Please complete your profile first.");
      return res.redirect("/web/profile");
    }
    const alumniId = profileRow.rows[0].id;

    const now = new Date();
    const bidMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthName = now.toLocaleString("en-GB", { month: "long", year: "numeric" });

    const [currentBidResult, historyResult, countResult] = await Promise.all([
      query(
        "SELECT id, amount, bid_month, is_winner, created_at FROM monthly_bids WHERE alumni_id = $1 AND bid_month = $2 ORDER BY created_at DESC LIMIT 1",
        [alumniId, bidMonth],
      ),
      query(
        "SELECT id, amount, bid_month, is_winner, created_at FROM monthly_bids WHERE alumni_id = $1 ORDER BY created_at DESC",
        [alumniId],
      ),
      query(
        "SELECT COUNT(*) AS cnt FROM monthly_bids WHERE alumni_id = $1 AND bid_month = $2",
        [alumniId, bidMonth],
      ),
    ]);

    res.render("profile/bid", {
      bid: currentBidResult.rows[0] || null,
      bidHistory: historyResult.rows,
      bidsUsedThisMonth: parseInt(countResult.rows[0].cnt, 10),
      bidMonth,
      monthName,
      messages: res.locals.messages || {},
      title: "My Bid",
    });
  } catch (err) {
    next(err);
  }
});

router.post("/profile/bid", requireLogin, async (req: any, res, next) => {
  try {
    const { query } = await import("../config/db");
    const userId: string = req.session.userId;

    // Resolve the alumni_profiles.id (integer PK used by monthly_bids)
    const profileRow = await query(
      "SELECT id FROM alumni_profiles WHERE user_id = $1",
      [userId],
    );
    if (!profileRow.rows[0]) {
      req.flash("error", "Profile not found. Please complete your profile first.");
      return res.redirect("/web/profile");
    }
    const alumniId: string = profileRow.rows[0].id;

    // Parse and validate amount
    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount <= 0) {
      req.flash("error", "Please enter a valid bid amount.");
      return res.redirect("/web/profile/bid");
    }

    // Current YYYY-MM month string
    const now = new Date();
    const bidMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Count how many bids this alumni has placed this month
    const countResult = await query(
      "SELECT COUNT(*) AS cnt FROM monthly_bids WHERE alumni_id = $1 AND bid_month = $2",
      [alumniId, bidMonth],
    );
    const bidCount = parseInt(countResult.rows[0].cnt, 10);

    if (bidCount >= 3) {
      req.flash("error", "Monthly bid limit reached. You may place at most 3 bids per month.");
      return res.redirect("/web/profile/bid");
    }

    // Check whether this alumni already has a bid this month
    const existingResult = await query(
      "SELECT id, amount FROM monthly_bids WHERE alumni_id = $1 AND bid_month = $2 ORDER BY created_at DESC LIMIT 1",
      [alumniId, bidMonth],
    );
    const existing = existingResult.rows[0];

    if (existing) {
      const previousAmount = parseFloat(existing.amount);
      if (amount <= previousAmount) {
        // Do NOT reveal other alumni bids – only compare against own previous bid
        req.flash("error", `Bid must be higher than your current bid of £${previousAmount.toFixed(2)}.`);
        return res.redirect("/web/profile/bid");
      }
      // Update the existing row
      await query(
        "UPDATE monthly_bids SET amount = $1, updated_at = NOW() WHERE id = $2",
        [amount, existing.id],
      );
    } else {
      // Insert a new bid row
      await query(
        "INSERT INTO monthly_bids (alumni_id, amount, bid_month) VALUES ($1, $2, $3)",
        [alumniId, amount, bidMonth],
      );
    }

    req.flash("success", `Bid of £${amount.toFixed(2)} placed for ${bidMonth}.`);
    res.redirect("/web/profile/bid");
  } catch (err) {
    next(err);
  }
});

// ─── Profile sections ─────────────────────────────────────────────────────────

const sections = ["degrees", "certifications", "licences", "professional_courses", "employment_history"];

sections.forEach((section) => {
  const route =
    section === "professional_courses" ? "courses" :
    section === "employment_history"   ? "employment" :
    section;

  router.get(`/profile/${route}`, requireLogin, async (req: any, res, next) => {
    try {
      const response = await fetch(`${apiUrl(req)}/profile`, { headers: toCookieHeader(req) });
      const redirect = handleUnauthorized(req, res, response);
      if (redirect) return redirect;
      if (!response.ok) {
        await flashApiError(req, response, "Could not load profile data");
        return res.redirect("/web/profile");
      }
      const profile = await response.json();
      const pageTitle = route.charAt(0).toUpperCase() + route.slice(1);
      res.render(`profile/${route}`, { profile, section, messages: res.locals.messages || {}, title: pageTitle });
    } catch (err) {
      next(err);
    }
  });

  router.post(`/profile/${route}`, requireLogin, async (req: any, res, next) => {
    try {
      const response = await fetch(`${apiUrl(req)}/profile/${section}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...toCookieHeader(req) },
        body: JSON.stringify(req.body),
      });
      const redirect = handleUnauthorized(req, res, response);
      if (redirect) return redirect;
      if (!response.ok) {
        await flashApiError(req, response, `Failed to add ${route} entry`);
      } else {
        req.flash("success", "Entry added successfully");
      }
      res.redirect(`/web/profile/${route}`);
    } catch (err) {
      next(err);
    }
  });

  router.post(`/profile/${route}/:id/delete`, requireLogin, async (req: any, res, next) => {
    try {
      const apiHeaders = {
        ...toCookieHeader(req),
        "x-csrf-token": req.body?._csrf || req.query?._csrf || req.get("x-csrf-token") || "",
      };
      const response = await fetch(`${apiUrl(req)}/profile/${section}/${req.params.id}`, {
        method: "DELETE",
        headers: apiHeaders,
      });
      const redirect = handleUnauthorized(req, res, response);
      if (redirect) return redirect;
      if (!response.ok) {
        await flashApiError(req, response, `Failed to delete ${route} entry`);
      } else {
        req.flash("success", "Entry removed");
      }
      res.redirect(`/web/profile/${route}`);
    } catch (err) {
      next(err);
    }
  });
});

export default router;
