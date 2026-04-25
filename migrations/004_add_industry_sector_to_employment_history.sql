ALTER TABLE employment_history
  ADD COLUMN IF NOT EXISTS industry_sector VARCHAR(255);
