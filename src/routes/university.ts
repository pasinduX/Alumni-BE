import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { fetch } from "undici";
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
  if (!session?.universityApiKey) {
    res.redirect("/university/login");
    return;
  }
  next();
}

// ── GET /university/login ────────────────────────────────────────────────────

router.get("/login", (req: Request, res: Response) => {
  const session = req.session as any;
  if (session?.universityApiKey) {
    return res.redirect("/university/dashboard");
  }
  res.render("university/login", {
    title: "University Portal Login",
    error: req.flash("error"),
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

    // Look up user
    const userResult = await query(
      "SELECT id, password_hash FROM users WHERE email = $1 AND is_verified = TRUE LIMIT 1",
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      req.flash("error", "Invalid credentials.");
      return res.redirect("/university/login");
    }

    const user = userResult.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      req.flash("error", "Invalid credentials.");
      return res.redirect("/university/login");
    }

    // Fetch the analytics-dashboard API key (raw key_hash stored — pass as Bearer token)
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

export default router;
