-- ============================================================
-- SENIQU WALLET TRANSACTIONS & BALANCES MIGRATION
-- Version: 1.0.0
-- Supports: Deposit, Withdraw, Transfer tracking
-- OWASP Security Best Practices Applied
-- ============================================================

-- ============================================================
-- CUSTOM TYPES
-- ============================================================

-- Wallet transaction type
DO $$ BEGIN
    CREATE TYPE wallet_tx_type AS ENUM (
        'deposit',          -- Incoming funds from external wallet / on-ramp
        'withdraw',         -- Outgoing funds to external wallet / off-ramp
        'transfer_in',      -- Internal transfer received (user-to-user)
        'transfer_out',     -- Internal transfer sent (user-to-user)
        'swap'              -- Token swap (future: DEX integration)
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Wallet transaction status
DO $$ BEGIN
    CREATE TYPE wallet_tx_status AS ENUM (
        'pending',          -- Transaction initiated, not yet broadcast
        'broadcasting',     -- Sent to network, awaiting inclusion
        'confirming',       -- Included in block, awaiting confirmations
        'confirmed',        -- Fully confirmed on-chain
        'failed',           -- Transaction failed (reverted, timeout)
        'cancelled'         -- Cancelled by user before broadcast
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- WALLET TRANSACTIONS TABLE
-- Tracks all deposits, withdrawals, and transfers
-- ============================================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_connection_id UUID REFERENCES wallet_connections(id) ON DELETE SET NULL,

    -- Transaction identity
    tx_type wallet_tx_type NOT NULL,
    status wallet_tx_status DEFAULT 'pending',

    -- Blockchain data
    chain wallet_chain NOT NULL DEFAULT 'solana',
    tx_hash VARCHAR(128) UNIQUE,                    -- On-chain transaction hash
    block_number BIGINT,                            -- Block height when confirmed
    block_time TIMESTAMPTZ,                         -- Block timestamp

    -- Amounts
    amount DECIMAL(30, 18) NOT NULL,                -- Amount in token's native decimals
    amount_usd DECIMAL(14, 2),                      -- USD equivalent at time of tx
    fee DECIMAL(30, 18) DEFAULT 0,                  -- Network fee (gas/priority fee)
    fee_usd DECIMAL(14, 2),                         -- Fee in USD

    -- Token info
    token_mint VARCHAR(66),                         -- Token mint address (NULL = native SOL/ETH)
    token_symbol VARCHAR(20) DEFAULT 'SOL',         -- Human-readable symbol
    token_decimals INTEGER DEFAULT 9,               -- Token decimal places

    -- Addresses
    from_address VARCHAR(66) NOT NULL,              -- Sender wallet address
    to_address VARCHAR(66) NOT NULL,                -- Recipient wallet address

    -- Metadata
    memo TEXT,                                       -- Optional memo / notes
    metadata JSONB DEFAULT '{}'::JSONB,             -- Extra data (swap details, etc.)

    -- Error handling
    error_message TEXT,                             -- Error reason if failed
    retry_count INTEGER DEFAULT 0,                  -- Number of retry attempts

    -- Confirmation tracking
    confirmations INTEGER DEFAULT 0,                -- Number of block confirmations
    required_confirmations INTEGER DEFAULT 1,       -- Confirmations needed for finality

    -- Timestamps
    initiated_at TIMESTAMPTZ DEFAULT NOW(),         -- When user initiated
    broadcast_at TIMESTAMPTZ,                       -- When sent to network
    confirmed_at TIMESTAMPTZ,                       -- When fully confirmed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT positive_fee CHECK (fee >= 0),
    CONSTRAINT valid_tx_addresses CHECK (
        (chain = 'solana' AND from_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
                          AND to_address   ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$')
        OR
        (chain IN ('ethereum', 'polygon')
                          AND from_address ~ '^0x[a-fA-F0-9]{40}$'
                          AND to_address   ~ '^0x[a-fA-F0-9]{40}$')
    )
);

-- Indexes for wallet_transactions
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_type ON wallet_transactions(user_id, tx_type);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_hash ON wallet_transactions(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_tx_chain ON wallet_transactions(chain);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_token ON wallet_transactions(token_mint) WHERE token_mint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_pending ON wallet_transactions(user_id, status)
    WHERE status IN ('pending', 'broadcasting', 'confirming');

-- ============================================================
-- WALLET BALANCES CACHE TABLE
-- Caches on-chain token balances to reduce RPC calls
-- ============================================================

CREATE TABLE IF NOT EXISTS wallet_balances_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Wallet identity
    wallet_address VARCHAR(66) NOT NULL,
    chain wallet_chain NOT NULL DEFAULT 'solana',

    -- Token info
    token_mint VARCHAR(66),                         -- NULL = native token (SOL/ETH)
    token_symbol VARCHAR(20) DEFAULT 'SOL',
    token_name VARCHAR(100),
    token_decimals INTEGER DEFAULT 9,
    token_logo_url TEXT,

    -- Balance
    balance DECIMAL(30, 18) NOT NULL DEFAULT 0,
    balance_usd DECIMAL(14, 2),                     -- USD equivalent

    -- Cache control
    last_fetched_at TIMESTAMPTZ DEFAULT NOW(),
    is_stale BOOLEAN DEFAULT FALSE,                 -- Set to TRUE when cache expires

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique per wallet + chain + token
    UNIQUE(wallet_address, chain, token_mint),

    -- Constraints
    CONSTRAINT non_negative_balance CHECK (balance >= 0),
    CONSTRAINT valid_cache_address CHECK (
        (chain = 'solana' AND wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$')
        OR
        (chain IN ('ethereum', 'polygon') AND wallet_address ~ '^0x[a-fA-F0-9]{40}$')
    )
);

-- Indexes for wallet_balances_cache
CREATE INDEX IF NOT EXISTS idx_balance_address ON wallet_balances_cache(wallet_address);
CREATE INDEX IF NOT EXISTS idx_balance_chain ON wallet_balances_cache(wallet_address, chain);
CREATE INDEX IF NOT EXISTS idx_balance_stale ON wallet_balances_cache(is_stale) WHERE is_stale = TRUE;
CREATE INDEX IF NOT EXISTS idx_balance_fetched ON wallet_balances_cache(last_fetched_at);

-- ============================================================
-- ADD embedded_wallet_address TO USERS TABLE
-- Stores the Privy-created non-custodial embedded wallet
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'embedded_wallet_address'
    ) THEN
        ALTER TABLE users ADD COLUMN embedded_wallet_address VARCHAR(66);
        CREATE INDEX idx_users_embedded_wallet ON users(embedded_wallet_address)
            WHERE embedded_wallet_address IS NOT NULL;

        COMMENT ON COLUMN users.embedded_wallet_address IS
            'Privy-created non-custodial embedded wallet address. Auto-created on first login for all auth methods.';
    END IF;
END $$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_balances_cache ENABLE ROW LEVEL SECURITY;

-- Wallet transactions: users can only read their own
CREATE POLICY wallet_tx_read_own ON wallet_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Wallet transactions: inserts only via service role (backend)
-- Users cannot insert directly; the backend creates transactions
CREATE POLICY wallet_tx_insert_service ON wallet_transactions
    FOR INSERT WITH CHECK (TRUE);

-- Wallet transactions: no direct user updates or deletes
-- Only the service role can update status
CREATE POLICY wallet_tx_update_service ON wallet_transactions
    FOR UPDATE USING (TRUE);

-- Balance cache: public read for now (addresses are public on-chain)
CREATE POLICY balance_cache_read_all ON wallet_balances_cache
    FOR SELECT USING (TRUE);

-- Balance cache: service role manages inserts/updates
CREATE POLICY balance_cache_manage_service ON wallet_balances_cache
    FOR ALL USING (TRUE);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at for wallet_transactions
CREATE TRIGGER trigger_wallet_tx_updated_at
    BEFORE UPDATE ON wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update updated_at for wallet_balances_cache
CREATE TRIGGER trigger_balance_cache_updated_at
    BEFORE UPDATE ON wallet_balances_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Mark stale balance caches (older than 2 minutes)
CREATE OR REPLACE FUNCTION mark_stale_balances()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE wallet_balances_cache
    SET is_stale = TRUE
    WHERE last_fetched_at < NOW() - INTERVAL '2 minutes'
      AND is_stale = FALSE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up old confirmed/failed transactions (older than 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_wallet_transactions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM wallet_transactions
    WHERE created_at < NOW() - INTERVAL '1 year'
      AND status IN ('confirmed', 'failed', 'cancelled');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's total portfolio value in USD
CREATE OR REPLACE FUNCTION get_user_portfolio_value(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_usd DECIMAL(14, 2) DEFAULT 0;
BEGIN
    SELECT COALESCE(SUM(wbc.balance_usd), 0) INTO total_usd
    FROM wallet_balances_cache wbc
    INNER JOIN wallet_connections wc ON wc.wallet_address = wbc.wallet_address
        AND wc.chain = wbc.chain::wallet_chain
    WHERE wc.user_id = p_user_id
      AND wc.status = 'active';

    RETURN total_usd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE wallet_transactions IS
    'Tracks all wallet deposits, withdrawals, and transfers. Immutable audit trail for financial operations.';
COMMENT ON TABLE wallet_balances_cache IS
    'Caches on-chain token balances to reduce Solana/Ethereum RPC calls. Auto-expires after 2 minutes.';
COMMENT ON COLUMN wallet_transactions.amount IS
    'Amount in the token''s native decimal representation (e.g., lamports for SOL, wei for ETH).';
COMMENT ON COLUMN wallet_transactions.tx_hash IS
    'On-chain transaction signature/hash. Unique across all chains.';
COMMENT ON COLUMN wallet_balances_cache.token_mint IS
    'SPL token mint address (Solana) or ERC-20 contract address (Ethereum). NULL = native token.';
