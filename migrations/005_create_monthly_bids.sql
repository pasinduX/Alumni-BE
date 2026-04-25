-- Monthly bid-for-featured-profile system
-- Each alumni may place up to 3 bids per calendar month.
-- bid_month is stored as a YYYY-MM string (e.g. '2026-04').
-- The highest-amount bid at month-end becomes the featured profile.

CREATE TABLE IF NOT EXISTS monthly_bids (
  id           SERIAL        PRIMARY KEY,
  alumni_id    UUID          NOT NULL
                 REFERENCES alumni_profiles(id) ON DELETE CASCADE,
  amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  bid_month    VARCHAR(7)    NOT NULL,             -- 'YYYY-MM'
  is_winner    BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monthly_bids_alumni_month
  ON monthly_bids (alumni_id, bid_month);

CREATE INDEX IF NOT EXISTS idx_monthly_bids_month
  ON monthly_bids (bid_month);

-- Settings table – stores global key/value pairs (e.g. featured_profile_id).
CREATE TABLE IF NOT EXISTS settings (
  key          VARCHAR(100) PRIMARY KEY,
  value        TEXT,
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO settings (key, value)
VALUES ('featured_profile_id', NULL)
ON CONFLICT (key) DO NOTHING;
