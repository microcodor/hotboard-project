INSERT INTO plans (slug, name, daily_limit, max_api_keys, history_days, features) VALUES
  ('free',       'Free',       100,   1,  0,  '[]'::jsonb),
  ('basic',      'Basic',      5000,  1,  7,  '[]'::jsonb),
  ('pro',        'Pro',        50000, 5,  30, '[]'::jsonb),
  ('enterprise', 'Enterprise', -1,    -1, 90, '[]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subscriptions (user_id, plan_id, status, expires_at)
SELECT u.id, p.id, 'active', NULL
FROM users u, plans p WHERE p.slug = 'free'
ON CONFLICT DO NOTHING;

INSERT INTO credits (user_id, balance) SELECT id, 0 FROM users ON CONFLICT DO NOTHING;
