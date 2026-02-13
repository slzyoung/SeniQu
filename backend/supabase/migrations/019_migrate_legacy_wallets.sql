-- Migration 019: Migrate legacy wallets from privy_wallets to wallet_logins
-- This moves ALL existing wallets to the external 'wallet_logins' table.
-- REAL Embedded Wallets will be automatically moved back to 'privy_wallets' 
-- upon the user's next login via the 'syncWallets' function.

-- 1. Insert all current privy_wallets into wallet_logins
INSERT INTO wallet_logins (user_id, wallet_address, chain_type, provider_name, created_at, last_login_at)
SELECT 
    user_id, 
    wallet_address, 
    chain_type, 
    'migrated', -- Mark as migrated so we know source
    created_at, 
    last_verified_at
FROM privy_wallets
ON CONFLICT (user_id, wallet_address, chain_type) DO NOTHING;

-- 2. Clear privy_wallets
-- This ensures that only truly Embedded Wallets (verified by Privy Client Type 'privy')
-- will be re-inserted here during the next 'syncWallets' execution.
DELETE FROM privy_wallets;
