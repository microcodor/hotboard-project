-- Day 3: User System Security Features
-- This migration adds support for account deletion audit and OAuth tracking

-- Account deletion audit log
CREATE TABLE IF NOT EXISTS account_deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  reason TEXT,
  deleted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- OAuth provider tracking
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'google' | 'github'
  provider_account_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Password reset tracking (for rate limiting and security)
CREATE TABLE IF NOT EXISTS password_reset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  reset_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_email ON password_reset_logs(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_reset_at ON password_reset_logs(reset_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_deletion_logs_user_id ON account_deletion_logs(user_id);

-- RLS Policies for oauth_accounts
ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own OAuth accounts"
  ON oauth_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OAuth accounts"
  ON oauth_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OAuth accounts"
  ON oauth_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OAuth accounts"
  ON oauth_accounts FOR DELETE
  USING (auth.uid() = user_id);