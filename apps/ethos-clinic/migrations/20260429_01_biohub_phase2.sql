-- up
CREATE TABLE IF NOT EXISTS biohub_access_profiles (
  user_id TEXT PRIMARY KEY,
  trial_started_at TIMESTAMPTZ NULL,
  trial_ends_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'none',
  is_ambassador BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_at TIMESTAMPTZ NULL,
  blocked_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_biohub_access_profiles_status ON biohub_access_profiles(status);
CREATE INDEX IF NOT EXISTS idx_biohub_access_profiles_updated_at ON biohub_access_profiles(updated_at);

CREATE TABLE IF NOT EXISTS biohub_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_biohub_subscriptions_user_id ON biohub_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_biohub_subscriptions_status ON biohub_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_biohub_subscriptions_updated_at ON biohub_subscriptions(updated_at);

CREATE TABLE IF NOT EXISTS biohub_plan_overrides (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  override_plan TEXT NOT NULL,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ NULL,
  set_by_admin_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_biohub_plan_overrides_user_id ON biohub_plan_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_biohub_plan_overrides_updated_at ON biohub_plan_overrides(updated_at);

CREATE TABLE IF NOT EXISTS biohub_access_audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  before_json JSONB NOT NULL,
  after_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_biohub_access_audit_logs_target_user_id ON biohub_access_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_biohub_access_audit_logs_updated_at ON biohub_access_audit_logs(updated_at);

-- down
DROP TABLE IF EXISTS biohub_access_audit_logs;
DROP TABLE IF EXISTS biohub_plan_overrides;
DROP TABLE IF EXISTS biohub_subscriptions;
DROP TABLE IF EXISTS biohub_access_profiles;
