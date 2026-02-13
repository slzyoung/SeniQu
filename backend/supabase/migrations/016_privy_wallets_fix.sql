-- ============================================================
-- 016_privy_wallets_fix.sql
-- FIX: Multi-chain Wallet Architecture
-- DATE: 2026-02-13
-- DESCRIPTION: 
-- 1. Creates `privy_wallets` table (if not exists) to support 1:N wallets.
-- 2. Migrates existing mixed `users.wallet_address` data into `privy_wallets`.
-- 3. Ensures every user respects the multi-chain structure.
-- ============================================================

-- 1. Ensure Table Exists with Correct Structure
CREATE TABLE IF NOT EXISTS privy_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chain_type VARCHAR(50) NOT NULL, -- 'solana' or 'ethereum'
    wallet_address VARCHAR(66) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- CONSTRAINT: One wallet per chain per user
    CONSTRAINT one_wallet_per_chain_per_user UNIQUE (user_id, chain_type)
);

-- 2. Enable Security
ALTER TABLE privy_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS privy_wallets_read_own ON privy_wallets;
CREATE POLICY privy_wallets_read_own ON privy_wallets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS privy_wallets_modify_service ON privy_wallets;
CREATE POLICY privy_wallets_modify_service ON privy_wallets
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_privy_wallets_lookup ON privy_wallets(user_id, chain_type);
CREATE INDEX IF NOT EXISTS idx_privy_wallets_address ON privy_wallets(wallet_address);


-- ============================================================
-- 4. CRITICAL DATA MIGRATION (The Fix)
-- ============================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Starting Wallet Migration...';

    -- Loop through users who have a wallet_address
    FOR r IN SELECT id, wallet_address FROM users WHERE wallet_address IS NOT NULL LOOP
        
        -- CASE A: Ethereum Address (Starts with 0x and is 42 chars)
        IF r.wallet_address ~ '^0x[a-fA-F0-9]{40}$' THEN
            INSERT INTO privy_wallets (user_id, wallet_address, chain_type)
            VALUES (r.id, r.wallet_address, 'ethereum')
            ON CONFLICT (user_id, chain_type) 
            DO UPDATE SET wallet_address = EXCLUDED.wallet_address, updated_at = NOW();
            
        -- CASE B: Solana Address (Base58, usually 32-44 chars, not 0x)
        ELSIF r.wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$' THEN
            INSERT INTO privy_wallets (user_id, wallet_address, chain_type)
            VALUES (r.id, r.wallet_address, 'solana')
            ON CONFLICT (user_id, chain_type) 
            DO UPDATE SET wallet_address = EXCLUDED.wallet_address, updated_at = NOW();
        END IF;

    END LOOP;
    
    RAISE NOTICE 'Wallet Migration Completed Successfully.';
END $$;

-- ============================================================
-- 5. COMMENTARY & CLEANUP
-- ============================================================

COMMENT ON TABLE privy_wallets IS 'Stores multi-chain wallets (Solana, Ethereum) for each user. Replaces the single wallet_address column constraint.';
