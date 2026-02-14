-- Add privy_wallet_id column to privy_wallets
-- This ID is required for server-side signing operations via Privy API

ALTER TABLE privy_wallets 
ADD COLUMN IF NOT EXISTS privy_wallet_id VARCHAR(255);

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_privy_wallets_privy_id ON privy_wallets(privy_wallet_id);

COMMENT ON COLUMN privy_wallets.privy_wallet_id IS 'The internal Privy Wallet ID (required for signing transactions via Server API)';
