-- Migration 033: User system enhancement for SaaS
-- Adds email, plan, credits for self-service registration

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS credits_remaining INT DEFAULT 5;

-- Unique constraint on email (nullable during migration period)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Index for listing/filtering
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

COMMENT ON COLUMN users.email IS 'User email for self-registration';
COMMENT ON COLUMN users.plan IS 'Subscription plan: free, pro, enterprise';
COMMENT ON COLUMN users.credits_remaining IS 'Remaining generation credits';
