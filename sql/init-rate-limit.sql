CREATE TABLE IF NOT EXISTS api_usage (
  id      SERIAL PRIMARY KEY,
  key     VARCHAR(100) NOT NULL,
  date    DATE NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (key, date)
);
CREATE INDEX IF NOT EXISTS idx_api_usage_key_date ON api_usage(key, date);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS daily_limit INTEGER;
UPDATE plans SET daily_limit = 100   WHERE slug = 'free';
UPDATE plans SET daily_limit = 5000  WHERE slug = 'basic';
UPDATE plans SET daily_limit = 50000 WHERE slug = 'pro';
UPDATE plans SET daily_limit = NULL  WHERE slug = 'enterprise';
SELECT slug, daily_limit FROM plans ORDER BY id;
