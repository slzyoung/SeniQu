-- ============================================================
-- 024_enforce_unique_privy_wallets.sql
-- PURPOSE: Enforce STRICT 1-wallet-per-chain policy for privy_wallets
-- ============================================================

-- 1. Remove Duplicate Entries (Keep the most recently updated one)
-- This uses a temporary CTE to identify duplicates based on (user_id, chain_type)
-- and keeps the one with the latest updated_at timestamp.

DELETE FROM privy_wallets
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY user_id, chain_type 
                ORDER BY updated_at DESC, created_at DESC
            ) as row_num
        FROM privy_wallets
    ) t
    WHERE t.row_num > 1
);

-- 2. Drop existing constraint/index (Drop constraint first to avoid dependency errors)
ALTER TABLE privy_wallets DROP CONSTRAINT IF EXISTS one_wallet_per_chain_per_user;
DROP INDEX IF EXISTS one_wallet_per_chain_per_user;

-- 3. Add Strict Unique Constraint
ALTER TABLE privy_wallets
ADD CONSTRAINT one_wallet_per_chain_per_user UNIQUE (user_id, chain_type);

-- 4. Verify wallet_logins constraint (just in case)
-- Ensure external logins also don't have duplicates for the same connection
ALTER TABLE wallet_logins DROP CONSTRAINT IF EXISTS wallet_logins_user_id_wallet_address_chain_type_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_logins_unique 
ON wallet_logins(user_id, wallet_address, chain_type);

-- 5. Add comments
COMMENT ON CONSTRAINT one_wallet_per_chain_per_user ON privy_wallets IS 
'Ensures a user can only have ONE embedded wallet per chain type.';
