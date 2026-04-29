import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { fetch } from "undici";
import { authenticateUser, requestPasswordReset, resetUserPassword } from "../services/authService";
import { findByEmailWithAuth } from "../models/userModel";
import { authLimiter } from "../middleware/rateLimiter";
import { query } from "../config/db";
import { config } from "../config";

const router = Router();

// ── Auth guard ───────────────────────────────────────────────────────────────

export function requireUniversitySession(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const session = req.session as any;
  if (!session?.universityApiKey || session?.role !== "university_staff") {
    res.redirect("/university/login");
    return;
  }
  next();
}

// ── Shared helper: fetch filter dropdown meta ─────────────────────────────────

async function fetchFilterMeta(
  baseUrl: string,
  headers: Record<string, string>
): Promise<{ programmes: string[]; graduationYears: number[] }> {
  const [pRes, yRes] = await Promise.all([
    fetch(`${baseUrl}/api/analytics/programme-list`,   { headers }),
    fetch(`${baseUrl}/api/analytics/graduation-years`, { headers }),
  ]);
  const programmes:     string[] = pRes.ok ? (await pRes.json() as string[]) : [];
  const graduationYears: number[] = yRes.ok ? (await yRes.json() as number[]) : [];
  return { programmes, graduationYears };
}

// ── GET /university/login ────────────────────────────────────────────────────

router.get("/login", (req: Request, res: Response) => {
  const session = req.session as any;
  if (session?.userId) {
    if (session.role === "university_staff") return res.redirect("/university/dashboard");
    return res.redirect("/web/profile");
  }

  const messages: any = {};
  if (req.query.verified === "1") {
    messages.success = ["Email verified successfully. You can now log in."];
  } else if (req.query.verified === "0") {
    messages.error = req.query.error === "token_expired"
      ? ["Verification link expired. Please request a new verification email."]
      : ["Invalid verification link. Please check your email and try again."];
  }

  res.render("university/login", {
    title: "University Portal Login",
    messages,
    error: req.flash("error"),
  });
});

router.get("/register", (req: Request, res: Response) => {
  const session = req.session as any;
  if (session?.userId) {
    if (session.role === "university_staff") return res.redirect("/university/dashboard");
    return res.redirect("/web/profile");
  }
  res.render("university/register", {
    title: "University Staff Registration",
    messages: req.flash(),
  });
});

// ── POST /university/login ───────────────────────────────────────────────────

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      req.flash("error", "Email and password are required.");
      return res.redirect("/university/login");
    }

    const allowedDomain = config.allowedDomain;
    if (!email.toLowerCase().endsWith(`@${allowedDomain}`)) {
      req.flash("error", `Only @${allowedDomain} accounts may access this portal.`);
      return res.redirect("/university/login");
    }

    const user = await authenticateUser(email.toLowerCase(), password);
    if (!user || user.role !== "university_staff") {
      req.flash("error", "Invalid credentials.");
      return res.redirect("/university/login");
    }

    const keyResult = await query(
      `SELECT key_hash FROM api_keys
       WHERE client_name = 'analytics-dashboard' AND is_active = TRUE
       LIMIT 1`,
      []
    );

    if (keyResult.rows.length === 0) {
      req.flash("error", "University dashboard API key is not configured.");
      return res.redirect("/university/login");
    }

    const session = req.session as any;
    session.userId           = user.id;
    session.role             = user.role;
    session.email            = email.toLowerCase();
    session.universityApiKey = keyResult.rows[0].key_hash;
    session.universityUserId = user.id;

    return res.redirect("/university/dashboard");
  } catch (err) {
    next(err);
  }
});

// ── GET /university/logout ───────────────────────────────────────────────────

router.get("/logout", (req: Request, res: Response, next: NextFunction) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.redirect("/university/login");
  });
});

// ── GET /university/forgot-password ─────────────────────────────────────────

router.get("/forgot-password", (req: Request, res: Response) => {
  const session = req.session as any;
  if (session?.userId && session?.role === "university_staff") {
    return res.redirect("/university/dashboard");
  }
  res.render("university/forgot-password", {
    title: "Forgot Password",
    messages: (req as any).flash ? (req as any).flash() : {},
  });
});

// ── POST /university/forgot-password ─────────────────────────────────────────

router.post(
  "/forgot-password",
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = String(req.body.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        (req as any).flash("error", "Please enter a valid email address.");
        return res.redirect("/university/forgot-password");
      }

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      const user = await findByEmailWithAuth(email);
      if (user && user.role === "university_staff") {
        await requestPasswordReset(email, baseUrl, "/university/reset-password");
      }

      (req as any).flash("success", "If that email is registered, reset instructions have been sent. Check your inbox.");
      return res.redirect("/university/forgot-password");
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/reset-password ───────────────────────────────────────────

router.get("/reset-password", (req: Request, res: Response) => {
  res.render("university/reset-password", {
    title: "Reset Password",
    token: String(req.query.token || ""),
    messages: (req as any).flash ? (req as any).flash() : {},
  });
});

// ── POST /university/reset-password ──────────────────────────────────────────

router.post(
  "/reset-password",
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token       = String(req.body.token || "").trim();
      const newPassword = String(req.body.newPassword || "");
      const confirmPass = String(req.body.confirmPassword || "");

      if (!token || !newPassword) {
        (req as any).flash("error", "Reset token and new password are required.");
        return res.redirect(`/university/reset-password?token=${encodeURIComponent(token)}`);
      }

      if (newPassword !== confirmPass) {
        (req as any).flash("error", "Passwords do not match.");
        return res.redirect(`/university/reset-password?token=${encodeURIComponent(token)}`);
      }

      await resetUserPassword(token, newPassword);
      (req as any).flash("success", "Password reset successfully. Please sign in with your new password.");
      return res.redirect("/university/login");
    } catch (err: any) {
      const isTokenErr = err?.code === "INVALID_TOKEN" || err?.code === "TOKEN_EXPIRED";
      if (isTokenErr) {
        (req as any).flash("error", err.code === "TOKEN_EXPIRED"
          ? "Reset link has expired. Please request a new one."
          : "Invalid reset token. Please request a new link.");
        return res.redirect("/university/forgot-password");
      }
      next(err);
    }
  }
);

// ── GET /university/dashboard ────────────────────────────────────────────────

router.get(
  "/dashboard",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = req.session as any;
      const apiKey  = session.universityApiKey as string;
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const headers = { Authorization: `Bearer ${apiKey}` };

      const [alumniRes, certsRes, employersRes, sectorRes] = await Promise.all([
        fetch(`${baseUrl}/api/alumni?limit=1`, { headers }),
        fetch(`${baseUrl}/api/analytics/certification-trends`, { headers }),
        fetch(`${baseUrl}/api/analytics/top-employers`, { headers }),
        fetch(`${baseUrl}/api/analytics/employment-by-sector`, { headers }),
      ]);

      let totalAlumni = 0;
      if (alumniRes.ok) {
        const d = (await alumniRes.json()) as any;
        totalAlumni = d?.pagination?.total ?? 0;
      }

      let totalCertifications = 0;
      let monthlyActive = 0;
      let trendsData: Array<{ month: string; count: number }> = [];
      if (certsRes.ok) {
        trendsData          = (await certsRes.json()) as Array<{ month: string; count: number }>;
        totalCertifications = trendsData.reduce((sum, r) => sum + r.count, 0);
        const now           = new Date();
        const thisMonth     = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        monthlyActive       = trendsData.find((r) => r.month === thisMonth)?.count ?? 0;
      }

      let totalEmployers = 0;
      let topEmployers: Array<{ company: string; count: number }> = [];
      if (employersRes.ok) {
        topEmployers   = (await employersRes.json()) as Array<{ company: string; count: number }>;
        totalEmployers = topEmployers.length;
      }

      let topSectors: Array<{ sector: string; count: number }> = [];
      if (sectorRes.ok) {
        topSectors = (await sectorRes.json()) as Array<{ sector: string; count: number }>;
      }

      res.render("university/dashboard", {
        title:              "University Dashboard",
        totalAlumni,
        totalCertifications,
        totalEmployers,
        monthlyActive,
        topEmployers:  topEmployers.slice(0, 6),
        topSectors:    topSectors.slice(0, 6),
        trendsData,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/charts/skills-gap ────────────────────────────────────────

router.get(
  "/charts/skills-gap",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session  = req.session as any;
      const apiKey   = session.universityApiKey as string;
      const baseUrl  = `${req.protocol}://${req.get("host")}`;
      const headers  = { Authorization: `Bearer ${apiKey}` };
      const { programme, graduation_year } = req.query as Record<string, string | undefined>;

      const qs = new URLSearchParams();
      if (programme)       qs.set("programme",       programme);
      if (graduation_year) qs.set("graduation_year", graduation_year);
      const qstr = qs.toString();

      const [meta, apiRes] = await Promise.all([
        fetchFilterMeta(baseUrl, headers),
        fetch(`${baseUrl}/api/analytics/skills-gap${qstr ? `?${qstr}` : ""}`, { headers }),
      ]);

      res.render("university/charts/skills-gap", {
        title:             "Skills Gap Analysis",
        chartData:         JSON.stringify(apiRes.ok ? await apiRes.json() : []),
        programmes:        meta.programmes,
        graduationYears:   meta.graduationYears,
        selectedProgramme: programme       ?? "",
        selectedYear:      graduation_year ?? "",
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/charts/employment-by-sector ───────────────────────────────

router.get(
  "/charts/employment-by-sector",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session  = req.session as any;
      const apiKey   = session.universityApiKey as string;
      const baseUrl  = `${req.protocol}://${req.get("host")}`;
      const headers  = { Authorization: `Bearer ${apiKey}` };
      const { programme, graduation_year } = req.query as Record<string, string | undefined>;

      const qs = new URLSearchParams();
      if (programme)       qs.set("programme",       programme);
      if (graduation_year) qs.set("graduation_year", graduation_year);
      const qstr = qs.toString();

      const [meta, sectorRes, titlesRes] = await Promise.all([
        fetchFilterMeta(baseUrl, headers),
        fetch(`${baseUrl}/api/analytics/employment-by-sector${qstr ? `?${qstr}` : ""}`, { headers }),
        fetch(`${baseUrl}/api/analytics/job-titles${qstr ? `?${qstr}` : ""}`,           { headers }),
      ]);

      res.render("university/charts/employment", {
        title:             "Employment Analytics",
        activePage:        "employment-by-sector",
        sectorData:        JSON.stringify(sectorRes.ok ? await sectorRes.json() : []),
        titlesData:        JSON.stringify(titlesRes.ok ? await titlesRes.json() : []),
        programmes:        meta.programmes,
        graduationYears:   meta.graduationYears,
        selectedProgramme: programme       ?? "",
        selectedYear:      graduation_year ?? "",
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/charts/job-titles ─────────────────────────────────────────

router.get(
  "/charts/job-titles",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session  = req.session as any;
      const apiKey   = session.universityApiKey as string;
      const baseUrl  = `${req.protocol}://${req.get("host")}`;
      const headers  = { Authorization: `Bearer ${apiKey}` };
      const { programme, graduation_year } = req.query as Record<string, string | undefined>;

      const qs = new URLSearchParams();
      if (programme)       qs.set("programme",       programme);
      if (graduation_year) qs.set("graduation_year", graduation_year);
      const qstr = qs.toString();

      const [meta, sectorRes, titlesRes] = await Promise.all([
        fetchFilterMeta(baseUrl, headers),
        fetch(`${baseUrl}/api/analytics/employment-by-sector${qstr ? `?${qstr}` : ""}`, { headers }),
        fetch(`${baseUrl}/api/analytics/job-titles${qstr ? `?${qstr}` : ""}`,           { headers }),
      ]);

      res.render("university/charts/employment", {
        title:             "Top Job Titles",
        activePage:        "job-titles",
        sectorData:        JSON.stringify(sectorRes.ok ? await sectorRes.json() : []),
        titlesData:        JSON.stringify(titlesRes.ok ? await titlesRes.json() : []),
        programmes:        meta.programmes,
        graduationYears:   meta.graduationYears,
        selectedProgramme: programme       ?? "",
        selectedYear:      graduation_year ?? "",
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/charts/top-employers ──────────────────────────────────────

router.get(
  "/charts/top-employers",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session  = req.session as any;
      const apiKey   = session.universityApiKey as string;
      const baseUrl  = `${req.protocol}://${req.get("host")}`;
      const headers  = { Authorization: `Bearer ${apiKey}` };
      const { programme, graduation_year } = req.query as Record<string, string | undefined>;

      const qs = new URLSearchParams();
      if (programme)       qs.set("programme",       programme);
      if (graduation_year) qs.set("graduation_year", graduation_year);
      const qstr = qs.toString();

      const [meta, apiRes] = await Promise.all([
        fetchFilterMeta(baseUrl, headers),
        fetch(`${baseUrl}/api/analytics/top-employers${qstr ? `?${qstr}` : ""}`, { headers }),
      ]);

      res.render("university/charts/employers", {
        title:             "Top Employers",
        chartData:         JSON.stringify(apiRes.ok ? await apiRes.json() : []),
        programmes:        meta.programmes,
        graduationYears:   meta.graduationYears,
        selectedProgramme: programme       ?? "",
        selectedYear:      graduation_year ?? "",
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/charts/certification-trends ───────────────────────────────

router.get(
  "/charts/certification-trends",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session  = req.session as any;
      const apiKey   = session.universityApiKey as string;
      const baseUrl  = `${req.protocol}://${req.get("host")}`;
      const headers  = { Authorization: `Bearer ${apiKey}` };
      const { programme, graduation_year } = req.query as Record<string, string | undefined>;

      const qs = new URLSearchParams();
      if (programme)       qs.set("programme",       programme);
      if (graduation_year) qs.set("graduation_year", graduation_year);
      const qstr = qs.toString();

      const [meta, apiRes] = await Promise.all([
        fetchFilterMeta(baseUrl, headers),
        fetch(`${baseUrl}/api/analytics/certification-trends${qstr ? `?${qstr}` : ""}`, { headers }),
      ]);

      res.render("university/charts/trends", {
        title:             "Certification Trends",
        chartData:         JSON.stringify(apiRes.ok ? await apiRes.json() : []),
        programmes:        meta.programmes,
        graduationYears:   meta.graduationYears,
        selectedProgramme: programme       ?? "",
        selectedYear:      graduation_year ?? "",
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/charts/geographic ─────────────────────────────────────────

router.get(
  "/charts/geographic",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session  = req.session as any;
      const apiKey   = session.universityApiKey as string;
      const baseUrl  = `${req.protocol}://${req.get("host")}`;
      const headers  = { Authorization: `Bearer ${apiKey}` };
      const { programme, graduation_year } = req.query as Record<string, string | undefined>;

      const qs = new URLSearchParams();
      if (programme)       qs.set("programme",       programme);
      if (graduation_year) qs.set("graduation_year", graduation_year);
      const qstr = qs.toString();

      const [meta, apiRes] = await Promise.all([
        fetchFilterMeta(baseUrl, headers),
        fetch(`${baseUrl}/api/analytics/geographic-distribution${qstr ? `?${qstr}` : ""}`, { headers }),
      ]);

      res.render("university/charts/geographic", {
        title:             "Geographic Distribution",
        chartData:         JSON.stringify(apiRes.ok ? await apiRes.json() : []),
        programmes:        meta.programmes,
        graduationYears:   meta.graduationYears,
        selectedProgramme: programme       ?? "",
        selectedYear:      graduation_year ?? "",
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/alumni ────────────────────────────────────────────────────

router.get(
  "/alumni",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = req.session as any;
      const apiKey  = session.universityApiKey as string;
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const { programme, graduation_year, industry_sector, page, limit } =
        req.query as Record<string, string | undefined>;

      const qs = new URLSearchParams();
      if (programme)       qs.set("programme",       programme);
      if (graduation_year) qs.set("graduation_year", graduation_year);
      if (industry_sector) qs.set("industry_sector", industry_sector);
      qs.set("page",  page  || "1");
      qs.set("limit", limit || "20");

      const apiRes = await fetch(`${baseUrl}/api/alumni?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const result: any = apiRes.ok ? await apiRes.json() : { data: [], pagination: {} };

      res.render("university/alumni", {
        title:      "Alumni Directory",
        alumni:     result.data       ?? [],
        pagination: result.pagination ?? {},
        filters: {
          programme:       programme       ?? "",
          graduation_year: graduation_year ?? "",
          industry_sector: industry_sector ?? "",
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/alumni/:id ───────────────────────────────────────────────

router.get(
  "/alumni/:id",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = req.session as any;
      const apiKey  = session.universityApiKey as string;
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const apiRes = await fetch(`${baseUrl}/api/alumni/${req.params.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (apiRes.status === 404) {
        return res.status(404).render("university/alumni", {
          title:      "Alumni Not Found",
          alumni:     [],
          pagination: {},
          filters:    { programme: "", graduation_year: "", industry_sector: "" },
        });
      }

      const alumni: any = apiRes.ok ? await apiRes.json() : null;
      if (!alumni) return res.redirect("/university/alumni");

      res.render("university/alumni-detail", {
        title: alumni.full_name || "Alumni Profile",
        alumni,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/bidding ───────────────────────────────────────────────────

router.get(
  "/bidding",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now      = new Date();
      const bidMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const result = await query(
        `SELECT
           ap.full_name        AS alumni_name,
           COUNT(mb.id)::int   AS bids_count,
           BOOL_OR(mb.is_winner) AS is_winner
         FROM alumni_profiles ap
         JOIN monthly_bids mb ON mb.alumni_id = ap.id
         WHERE mb.bid_month = $1
         GROUP BY ap.id, ap.full_name
         ORDER BY ap.full_name`,
        [bidMonth]
      );

      const flashMessages = (req as any).flash ? (req as any).flash() : {};

      res.render("university/bidding", {
        title:       "Bidding Activity",
        biddingData: result.rows,
        bidMonth,
        messages:    flashMessages,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /university/bidding/select-winner ────────────────────────────────────

router.post(
  "/bidding/select-winner",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now      = new Date();
      const bidMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const topBid = await query(
        `SELECT mb.id, ap.full_name
         FROM monthly_bids mb
         JOIN alumni_profiles ap ON ap.id = mb.alumni_id
         WHERE mb.bid_month = $1
         ORDER BY mb.amount DESC
         LIMIT 1`,
        [bidMonth]
      );

      if (topBid.rows.length === 0) {
        (req as any).flash("error", "No bids found for this month.");
        return res.redirect("/university/bidding");
      }

      const winner = topBid.rows[0];
      await query("UPDATE monthly_bids SET is_winner = FALSE WHERE bid_month = $1", [bidMonth]);
      await query("UPDATE monthly_bids SET is_winner = TRUE  WHERE id = $1",        [winner.id]);

      (req as any).flash("success", `Winner selected: ${winner.full_name}`);
      res.redirect("/university/bidding");
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/api/alumni (session-authenticated proxy) ──────────────────

router.get(
  "/api/alumni",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = req.session as any;
      const apiKey  = session.universityApiKey as string;
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const qs      = new URLSearchParams(req.query as Record<string, string>).toString();

      const apiRes = await fetch(`${baseUrl}/api/alumni?${qs}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      res.status(apiRes.status).json(await apiRes.json());
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/api/analytics/:endpoint (session-authenticated proxy) ─────

router.get(
  "/api/analytics/:endpoint",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = req.session as any;
      const apiKey  = session.universityApiKey as string;
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const allowed = new Set([
        "skills-gap", "employment-by-sector", "job-titles", "top-employers",
        "certification-trends", "career-pathways", "certification-growth",
        "programme-list", "graduation-years", "geographic-distribution",
      ]);

      if (!allowed.has(req.params.endpoint as string)) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const qs     = new URLSearchParams(req.query as Record<string, string>).toString();
      const apiRes = await fetch(
        `${baseUrl}/api/analytics/${req.params.endpoint}${qs ? `?${qs}` : ""}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );

      res.status(apiRes.status).json(await apiRes.json());
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/reports ───────────────────────────────────────────────────

router.get(
  "/reports",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = req.session as any;
      const apiKey  = session.universityApiKey as string;
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const [alumniRes, sectorRes, employersRes] = await Promise.all([
        fetch(`${baseUrl}/api/alumni?limit=1`,                     { headers: { Authorization: `Bearer ${apiKey}` } }),
        fetch(`${baseUrl}/api/analytics/employment-by-sector`,     { headers: { Authorization: `Bearer ${apiKey}` } }),
        fetch(`${baseUrl}/api/analytics/top-employers`,            { headers: { Authorization: `Bearer ${apiKey}` } }),
      ]);

      const alumniData    = alumniRes.ok    ? (await alumniRes.json()    as any)   : { pagination: { total: 0 } };
      const sectorData    = sectorRes.ok    ? (await sectorRes.json()    as any[]) : [];
      const employersData = employersRes.ok ? (await employersRes.json() as any[]) : [];

      res.render("university/reports", {
        title:       "Reports & Export",
        totalAlumni: alumniData?.pagination?.total ?? 0,
        topSector:   sectorData[0]?.sector    ?? "—",
        topEmployer: employersData[0]?.company ?? "—",
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/analytics/skills-gap-by-programme (Scenario 1) ───────────

router.get(
  "/analytics/skills-gap-by-programme",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session  = req.session as any;
      const apiKey   = session.universityApiKey as string;
      const baseUrl  = `${req.protocol}://${req.get("host")}`;
      const headers  = { Authorization: `Bearer ${apiKey}` };
      const selected = (req.query.programme as string) || "";

      const skillsUrl = selected
        ? `${baseUrl}/api/analytics/skills-gap?programme=${encodeURIComponent(selected)}`
        : `${baseUrl}/api/analytics/skills-gap`;

      const [programmesRes, skillsRes] = await Promise.all([
        fetch(`${baseUrl}/api/analytics/programme-list`, { headers }),
        fetch(skillsUrl, { headers }),
      ]);

      res.render("university/analytics/skills-gap-by-programme", {
        title:             "Skills Gap by Programme",
        programmes:        programmesRes.ok ? (await programmesRes.json() as string[]) : [],
        skillsData:        skillsRes.ok     ? (await skillsRes.json() as any[])        : [],
        selectedProgramme: selected,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/analytics/career-pathways (Scenario 2) ───────────────────

router.get(
  "/analytics/career-pathways",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session  = req.session as any;
      const apiKey   = session.universityApiKey as string;
      const baseUrl  = `${req.protocol}://${req.get("host")}`;
      const headers  = { Authorization: `Bearer ${apiKey}` };
      const selected = (req.query.programme as string) || "";

      const pathwayUrl = `${baseUrl}/api/analytics/career-pathways${selected ? `?programme=${encodeURIComponent(selected)}` : ""}`;

      const [programmesRes, pathwayRes] = await Promise.all([
        fetch(`${baseUrl}/api/analytics/programme-list`, { headers }),
        fetch(pathwayUrl, { headers }),
      ]);

      const pathway: any = pathwayRes.ok
        ? await pathwayRes.json()
        : (selected ? { programme: selected, total_alumni: 0, sectors: [], roles: [] } : []);

      res.render("university/analytics/career-pathways", {
        title:             "Career Pathways",
        programmes:        programmesRes.ok ? (await programmesRes.json() as string[]) : [],
        pathway,
        selectedProgramme: selected,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/analytics/certification-growth (Scenario 3) ──────────────

router.get(
  "/analytics/certification-growth",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = req.session as any;
      const apiKey  = session.universityApiKey as string;
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const apiRes = await fetch(`${baseUrl}/api/analytics/certification-growth`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      res.render("university/analytics/certification-growth", {
        title:     "Certification Growth Trends",
        growthData: apiRes.ok ? (await apiRes.json() as any[]) : [],
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
