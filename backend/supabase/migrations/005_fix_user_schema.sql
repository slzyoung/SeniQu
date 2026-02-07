-- ============================================================
-- Fix User Schema - Add Missing Columns
-- ============================================================

-- Add privy_id for Privy authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS privy_id VARCHAR(255) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_privy_id ON users(privy_id);

-- Add admin related columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_role VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_level INTEGER DEFAULT 0;

-- Comment on columns
COMMENT ON COLUMN users.privy_id IS 'Privy DID for wallet authentication';
COMMENT ON COLUMN users.admin_role IS 'Granular admin role (e.g. moderator, editor)';
COMMENT ON COLUMN users.admin_level IS 'Numeric admin level for hierarchy';
