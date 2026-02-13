-- ============================================================
-- PRIVY WALLETS TABLE & SECURITY
-- Version: 1.0.0
-- Purpose: Secure storage for Privy embedded wallets (1 per chain per user)
-- OWASP: Data Protection, Access Control, Anti-Tampering
-- ============================================================

-- ============================================================
-- 1. PRIVY WALLETS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS privy_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Chain Identifier (reusing 'wallet_chain' enum from 014)
    chain_type wallet_chain NOT NULL,
    
    -- The Wallet Address
    wallet_address VARCHAR(66) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),

    -- CONSTRAINT: Prevent duplicates (One wallet per chain per user)
    CONSTRAINT one_wallet_per_chain_per_user UNIQUE (user_id, chain_type),
    
    -- CONSTRAINT: Address Format Validation
    CONSTRAINT valid_privy_wallet_address CHECK (
        (chain_type = 'solana' AND wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$')
        OR
        (chain_type IN ('ethereum', 'polygon') AND wallet_address ~ '^0x[a-fA-F0-9]{40}$')
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_privy_wallets_user ON privy_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_privy_wallets_address ON privy_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_privy_wallets_lookup ON privy_wallets(user_id, chain_type);

-- ============================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE privy_wallets ENABLE ROW LEVEL SECURITY;

-- DROP 
DROP POLICY IF EXISTS privy_wallets_read_own ON privy_wallets;
-- Users can READ their OWN wallets only
CREATE POLICY privy_wallets_read_own
ON privy_wallets
FOR SELECT
USING (auth.uid() = user_id);

--DROP
DROP POLICY IF EXISTS privy_wallets_modify_service ON privy_wallets;
-- Only Service Role (Backend) can INSERT/UPDATE/DELETE
-- This prevents users from manually manipulating their wallet bindings via client-side calls
CREATE POLICY privy_wallets_modify_service ON privy_wallets
    FOR ALL 
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

-- Explicitly DENY insert/update/delete for authenticated users
-- The default is DENY, so by NOT creating a policy for 'authenticated', we achieve this.
-- The 'privy_wallets_read_own' allows SELECT only.


-- ============================================================
-- 3. AUTOMATION
-- ============================================================
--DROP
DROP TRIGGER IF EXISTS trigger_privy_wallets_updated_at
ON privy_wallets;

-- Auto-update updated_at
CREATE TRIGGER trigger_privy_wallets_updated_at
    BEFORE UPDATE ON privy_wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. COMMENTS
-- ============================================================

COMMENT ON TABLE privy_wallets IS 
    'Secure storage for Privy-assigned embedded wallets. Strictly enforcing one-wallet-per-chain per user.';

COMMENT ON COLUMN privy_wallets.wallet_address IS 
    'The public address of the embedded wallet. Validated by backend regex.';
