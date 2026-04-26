import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { fetch } from "undici";
import { authenticateUser } from "../services/authService";
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

// ── GET /university/login ────────────────────────────────────────────────────

router.get("/login", (req: Request, res: Response) => {
  const session = req.session as any;
  if (session?.userId) {
    if (session.role === "university_staff") {
      return res.redirect("/university/dashboard");
    }
    return res.redirect("/web/profile");
  }

  const messages: any = {};
  if (req.query.verified === "1") {
    messages.success = ["Email verified successfully. You can now log in."];
  } else if (req.query.verified === "0") {
    if (req.query.error === "token_expired") {
      messages.error = ["Verification link expired. Please request a new verification email."];
    } else {
      messages.error = ["Invalid verification link. Please check your email and try again."];
    }
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
    if (session.role === "university_staff") {
      return res.redirect("/university/dashboard");
    }
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

    // Enforce university domain
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
    session.userId = user.id;
    session.role = user.role;
    session.email = email.toLowerCase();
    session.universityApiKey = keyResult.rows[0].key_hash;
    session.universityUserId  = user.id;

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

// ── GET /university/dashboard ────────────────────────────────────────────────

router.get(
  "/dashboard",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session   = req.session as any;
      const apiKey    = session.universityApiKey as string;
      const baseUrl   = `${req.protocol}://${req.get("host")}`;
      const headers   = { Authorization: `Bearer ${apiKey}` };

      // Four parallel analytics fetches
      const [alumniRes, certsRes, employersRes, trendsRes] = await Promise.all([
        fetch(`${baseUrl}/api/alumni?limit=1`, { headers }),
        fetch(`${baseUrl}/api/analytics/certification-trends`, { headers }),
        fetch(`${baseUrl}/api/analytics/top-employers`, { headers }),
        fetch(`${baseUrl}/api/analytics/certification-trends`, { headers }),
      ]);

      // Total alumni — taken from pagination.total
      let totalAlumni = 0;
      if (alumniRes.ok) {
        const alumniData = (await alumniRes.json()) as any;
        totalAlumni = alumniData?.pagination?.total ?? 0;
      }

      // Total certifications — sum all monthly counts from certification-trends
      let totalCertifications = 0;
      if (certsRes.ok) {
        const certsData = (await certsRes.json()) as Array<{ month: string; count: number }>;
        totalCertifications = certsData.reduce((sum, row) => sum + row.count, 0);
      }

      // Total unique employers — count of top-employers rows returned
      let totalEmployers = 0;
      if (employersRes.ok) {
        const employersData = (await employersRes.json()) as Array<unknown>;
        totalEmployers = employersData.length;
      }

      // Monthly active — certifications added in the current month
      let monthlyActive = 0;
      if (trendsRes.ok) {
        const trendsData = (await trendsRes.json()) as Array<{ month: string; count: number }>;
        const now        = new Date();
        const thisMonth  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const row        = trendsData.find((r) => r.month === thisMonth);
        monthlyActive    = row?.count ?? 0;
      }

      res.render("university/dashboard", {
        title:              "University Dashboard",
        totalAlumni,
        totalCertifications,
        totalEmployers,
        monthlyActive,
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

      const apiRes = await fetch(`${baseUrl}/api/analytics/skills-gap`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const chartData = apiRes.ok
        ? await apiRes.json()
        : [];

      res.render("university/charts/skills-gap", {
        title:     "Skills Gap Analysis",
        chartData: JSON.stringify(chartData),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/charts/employment ────────────────────────────────────────

router.get(
  "/charts/employment",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = req.session as any;
      const apiKey  = session.universityApiKey as string;
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const headers = { Authorization: `Bearer ${apiKey}` };

      const [sectorRes, titlesRes] = await Promise.all([
        fetch(`${baseUrl}/api/analytics/employment-by-sector`, { headers }),
        fetch(`${baseUrl}/api/analytics/job-titles`,           { headers }),
      ]);

      const sectorData = sectorRes.ok ? await sectorRes.json() : [];
      const titlesData = titlesRes.ok ? await titlesRes.json() : [];

      res.render("university/charts/employment", {
        title:       "Employment Analytics",
        sectorData:  JSON.stringify(sectorData),
        titlesData:  JSON.stringify(titlesData),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/charts/trends ────────────────────────────────────────────

router.get(
  "/charts/trends",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = req.session as any;
      const apiKey  = session.universityApiKey as string;
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const apiRes = await fetch(`${baseUrl}/api/analytics/certification-trends`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const chartData = apiRes.ok ? await apiRes.json() : [];

      res.render("university/charts/trends", {
        title:     "Certification Trends",
        chartData: JSON.stringify(chartData),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /university/charts/employers ─────────────────────────────────────────

router.get(
  "/charts/employers",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = req.session as any;
      const apiKey  = session.universityApiKey as string;
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const apiRes = await fetch(`${baseUrl}/api/analytics/top-employers`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const chartData = apiRes.ok ? await apiRes.json() : [];

      res.render("university/charts/employers", {
        title:     "Top Employers",
        chartData: JSON.stringify(chartData),
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

// ── Route aliases (sidebar uses descriptive slugs) ───────────────────────────

router.get("/charts/employment-by-sector",  requireUniversitySession, (_req, res) => res.redirect("/university/charts/employment"));
router.get("/charts/job-titles",            requireUniversitySession, (_req, res) => res.redirect("/university/charts/employment"));
router.get("/charts/top-employers",         requireUniversitySession, (_req, res) => res.redirect("/university/charts/employers"));
router.get("/charts/certification-trends",  requireUniversitySession, (_req, res) => res.redirect("/university/charts/trends"));

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
        title:           "Alumni Directory",
        alumni:          result.data          ?? [],
        pagination:      result.pagination    ?? {},
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

// ── GET /university/bidding ───────────────────────────────────────────────────

router.get(
  "/bidding",
  requireUniversitySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
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
        [bidMonth],
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
      const now = new Date();
      const bidMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const topBid = await query(
        `SELECT mb.id, ap.full_name
         FROM monthly_bids mb
         JOIN alumni_profiles ap ON ap.id = mb.alumni_id
         WHERE mb.bid_month = $1
         ORDER BY mb.amount DESC
         LIMIT 1`,
        [bidMonth],
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

// ── GET /university/api/alumni (session-authenticated proxy for client JS) ────

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

      const data = await apiRes.json();
      res.status(apiRes.status).json(data);
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
      const session  = req.session as any;
      const apiKey   = session.universityApiKey as string;
      const baseUrl  = `${req.protocol}://${req.get("host")}`;
      const allowed  = new Set(["skills-gap", "employment-by-sector", "job-titles", "top-employers", "certification-trends"]);
      if (!allowed.has(req.params.endpoint as string)) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const apiRes = await fetch(`${baseUrl}/api/analytics/${req.params.endpoint}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await apiRes.json();
      res.status(apiRes.status).json(data);
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

      // Fetch summary stats for the report header
      const [alumniRes, sectorRes, employersRes] = await Promise.all([
        fetch(`${baseUrl}/api/alumni?limit=1`, { headers: { Authorization: `Bearer ${apiKey}` } }),
        fetch(`${baseUrl}/api/analytics/employment-by-sector`, { headers: { Authorization: `Bearer ${apiKey}` } }),
        fetch(`${baseUrl}/api/analytics/top-employers`, { headers: { Authorization: `Bearer ${apiKey}` } }),
      ]);

      const alumniData    = alumniRes.ok    ? (await alumniRes.json() as any)         : { pagination: { total: 0 } };
      const sectorData    = sectorRes.ok    ? (await sectorRes.json() as any[])        : [];
      const employersData = employersRes.ok ? (await employersRes.json() as any[])     : [];

      res.render("university/reports", {
        title:          "Reports & Export",
        totalAlumni:    alumniData?.pagination?.total ?? 0,
        topSector:      sectorData[0]?.sector ?? "—",
        topEmployer:    employersData[0]?.company ?? "—",
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
