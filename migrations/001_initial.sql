CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verification_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT FALSE,
  reset_token TEXT,
  reset_token_expires TIMESTAMPTZ,
  role VARCHAR(20) DEFAULT 'alumni' CHECK (role IN ('alumni','admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alumni_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  bio TEXT,
  linkedin_url TEXT,
  profile_image_url TEXT,
  monthly_win_count INT DEFAULT 0,
  attended_event_this_month BOOLEAN DEFAULT FALSE,
  profile_reset_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE degrees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  institution VARCHAR(255) NOT NULL,
  url TEXT,
  completed_at DATE
);

CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  provider VARCHAR(255),
  url TEXT,
  completed_at DATE
);

CREATE TABLE licences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  awarding_body VARCHAR(255),
  url TEXT,
  completed_at DATE
);

CREATE TABLE professional_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  provider VARCHAR(255),
  url TEXT,
  completed_at DATE
);

CREATE TABLE employment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE
);

CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bid_date DATE NOT NULL DEFAULT CURRENT_DATE + 1,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','cancelled','won','lost')),
  placed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, bid_date)
);

CREATE TABLE bid_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL REFERENCES bids(id),
  user_id UUID NOT NULL REFERENCES users(id),
  display_date DATE UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  selected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  key_hash TEXT UNIQUE NOT NULL,
  label VARCHAR(255),
  is_revoked BOOLEAN DEFAULT FALSE,
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_key_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bids_user_date ON bids(user_id, bid_date);
CREATE INDEX idx_bids_date ON bids(bid_date);
CREATE INDEX idx_bid_winners_date ON bid_winners(display_date);
CREATE INDEX idx_api_key_logs_key ON api_key_logs(api_key_id);
