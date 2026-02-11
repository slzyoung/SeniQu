-- ============================================================
-- SENIQU WALLET INFRASTRUCTURE MIGRATION
-- Version: 1.0.0
-- OWASP Security Best Practices Applied
-- Anti-Throttling, Anti-Replay, Multi-Chain Support
-- ============================================================

-- ============================================================
-- CUSTOM TYPES FOR WALLET
-- ============================================================

-- Chain type for multi-chain support
DO $$ BEGIN
    CREATE TYPE wallet_chain AS ENUM (
        'solana',
        'ethereum',
        'polygon'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Wallet provider type
DO $$ BEGIN
    CREATE TYPE wallet_provider AS ENUM (
        'embedded',       -- Privy embedded wallet
        'phantom',        -- Phantom browser extension / mobile
        'solflare',       -- Solflare browser extension / mobile
        'metamask',       -- MetaMask browser extension / mobile
        'walletconnect',  -- WalletConnect / Reown protocol
        'backpack',       -- Backpack wallet
        'coinbase',       -- Coinbase wallet
        'other'           -- Other wallets
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Wallet connection status
DO $$ BEGIN
    CREATE TYPE wallet_connection_status AS ENUM (
        'active',
        'disconnected',
        'revoked',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- WALLET CONNECTIONS TABLE
-- Tracks all wallet connections per user
-- ============================================================

CREATE TABLE IF NOT EXISTS wallet_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Wallet identity
    wallet_address VARCHAR(66) NOT NULL,
    chain wallet_chain NOT NULL DEFAULT 'solana',
    provider wallet_provider NOT NULL DEFAULT 'embedded',

    -- Connection metadata
    label VARCHAR(100),                          -- User-defined label (e.g. "My Phantom")
    is_primary BOOLEAN DEFAULT FALSE,            -- Primary wallet for the user
    is_embedded BOOLEAN DEFAULT FALSE,           -- Privy embedded wallet flag

    -- Status
    status wallet_connection_status DEFAULT 'active',

    -- Verification
    verified_at TIMESTAMPTZ,                     -- When signature was verified
    verification_signature TEXT,                  -- The signature used for verification

    -- Device info (OWASP: session binding)
    connected_from_ip INET,
    connected_from_ua TEXT,
    device_fingerprint VARCHAR(128),

    -- Timestamps
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    -- Each user can only have one connection per wallet address per chain
    UNIQUE(user_id, wallet_address, chain),

    -- Validate wallet address format:
    -- Solana: 32-44 chars base58 (alphanumeric, no 0OIl)
    -- Ethereum: 42 chars hex starting with 0x
    CONSTRAINT valid_wallet_address CHECK (
        (chain = 'solana' AND wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$')
        OR
        (chain IN ('ethereum', 'polygon') AND wallet_address ~ '^0x[a-fA-F0-9]{40}$')
    )
);

-- Indexes for wallet_connections
CREATE INDEX IF NOT EXISTS idx_wallet_conn_user ON wallet_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_conn_address ON wallet_connections(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_conn_chain ON wallet_connections(chain);
CREATE INDEX IF NOT EXISTS idx_wallet_conn_status ON wallet_connections(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_wallet_conn_primary ON wallet_connections(user_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_wallet_conn_user_active ON wallet_connections(user_id, status) WHERE status = 'active';

-- ============================================================
-- WALLET NONCES TABLE
-- Single-use nonces for wallet signature verification
-- OWASP: Anti-replay attack protection
-- ============================================================

CREATE TABLE IF NOT EXISTS wallet_nonces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Target wallet
    wallet_address VARCHAR(66) NOT NULL,
    chain wallet_chain NOT NULL DEFAULT 'solana',

    -- Nonce data
    nonce VARCHAR(128) NOT NULL UNIQUE,
    message TEXT NOT NULL,                        -- The full message that was signed

    -- Usage tracking
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    used_by_ip INET,

    -- Expiry (OWASP: short-lived tokens)
    expires_at TIMESTAMPTZ NOT NULL,

    -- Request metadata
    requested_from_ip INET,
    requested_from_ua TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_nonce_address CHECK (
        (chain = 'solana' AND wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$')
        OR
        (chain IN ('ethereum', 'polygon') AND wallet_address ~ '^0x[a-fA-F0-9]{40}$')
    )
);

-- Indexes for wallet_nonces
CREATE INDEX IF NOT EXISTS idx_nonce_address ON wallet_nonces(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nonce_value ON wallet_nonces(nonce);
CREATE INDEX IF NOT EXISTS idx_nonce_expires ON wallet_nonces(expires_at) WHERE is_used = FALSE;
CREATE INDEX IF NOT EXISTS idx_nonce_unused ON wallet_nonces(wallet_address, is_used, expires_at)
    WHERE is_used = FALSE;

-- ============================================================
-- WALLET SESSIONS TABLE
-- Tracks active wallet sessions with device fingerprinting
-- ============================================================

CREATE TABLE IF NOT EXISTS wallet_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_connection_id UUID NOT NULL REFERENCES wallet_connections(id) ON DELETE CASCADE,

    -- Session data
    session_token_hash VARCHAR(255) NOT NULL,
    chain wallet_chain NOT NULL,

    -- Device binding (OWASP: session fixation prevention)
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(128),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL,

    -- Activity tracking
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    total_transactions INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_session_token CHECK (LENGTH(session_token_hash) >= 32)
);

-- Indexes for wallet_sessions
CREATE INDEX IF NOT EXISTS idx_wallet_sess_user ON wallet_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_sess_conn ON wallet_sessions(wallet_connection_id);
CREATE INDEX IF NOT EXISTS idx_wallet_sess_token ON wallet_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_wallet_sess_active ON wallet_sessions(user_id, is_active)
    WHERE is_active = TRUE;

-- ============================================================
-- RATE LIMIT EVENTS TABLE
-- Server-side rate limiting tracking per wallet operation
-- OWASP: DoS and brute-force prevention
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identifier
    identifier VARCHAR(255) NOT NULL,            -- IP address or wallet address
    action VARCHAR(100) NOT NULL,                -- e.g. 'nonce_request', 'verify_signature', 'link_wallet'

    -- Event data
    event_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    window_end TIMESTAMPTZ NOT NULL,

    -- Blocking
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_until TIMESTAMPTZ,
    block_reason TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rate_limit_events
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_events(identifier, action);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_events(identifier, action, window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocked ON rate_limit_events(identifier, is_blocked)
    WHERE is_blocked = TRUE;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE wallet_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;

-- Wallet connections: users can only read their own
CREATE POLICY wallet_conn_read_own ON wallet_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY wallet_conn_insert_own ON wallet_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY wallet_conn_update_own ON wallet_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY wallet_conn_delete_own ON wallet_connections
    FOR DELETE USING (auth.uid() = user_id);

-- Wallet nonces: public insert (for generating nonces), no direct read
-- Nonces are read internally by the service role
CREATE POLICY wallet_nonce_service_all ON wallet_nonces
    FOR ALL USING (TRUE);

-- Wallet sessions: users can only read their own
CREATE POLICY wallet_sess_read_own ON wallet_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY wallet_sess_manage_own ON wallet_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Rate limit events: service role only (no direct user access)
CREATE POLICY rate_limit_service_only ON rate_limit_events
    FOR ALL USING (TRUE);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at for wallet_connections
CREATE TRIGGER trigger_wallet_conn_updated_at
    BEFORE UPDATE ON wallet_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update updated_at for rate_limit_events
CREATE TRIGGER trigger_rate_limit_updated_at
    BEFORE UPDATE ON rate_limit_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Clean up expired nonces (run periodically or via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM wallet_nonces
    WHERE expires_at < NOW() OR (is_used = TRUE AND used_at < NOW() - INTERVAL '1 hour');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired wallet sessions
CREATE OR REPLACE FUNCTION cleanup_expired_wallet_sessions()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE wallet_sessions
    SET is_active = FALSE
    WHERE expires_at < NOW() AND is_active = TRUE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up old rate limit windows
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM rate_limit_events
    WHERE window_end < NOW() - INTERVAL '1 day'
      AND is_blocked = FALSE;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure only one primary wallet per user
CREATE OR REPLACE FUNCTION ensure_single_primary_wallet()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = TRUE THEN
        UPDATE wallet_connections
        SET is_primary = FALSE
        WHERE user_id = NEW.user_id
          AND id != NEW.id
          AND is_primary = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_primary_wallet
    BEFORE INSERT OR UPDATE ON wallet_connections
    FOR EACH ROW
    WHEN (NEW.is_primary = TRUE)
    EXECUTE FUNCTION ensure_single_primary_wallet();

-- ============================================================
-- ADD privy_id COLUMN TO USERS TABLE IF NOT EXISTS
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'privy_id'
    ) THEN
        ALTER TABLE users ADD COLUMN privy_id VARCHAR(100) UNIQUE;
        CREATE INDEX idx_users_privy_id ON users(privy_id);
    END IF;
END $$;

-- ============================================================
-- COMMENTS (Documentation)
-- ============================================================

COMMENT ON TABLE wallet_connections IS 'Tracks all wallet connections per user with chain type, provider, and verification status. OWASP compliant.';
COMMENT ON TABLE wallet_nonces IS 'Single-use nonces for wallet signature verification. Prevents replay attacks per OWASP A7.';
COMMENT ON TABLE wallet_sessions IS 'Active wallet sessions with device fingerprinting for anomaly detection.';
COMMENT ON TABLE rate_limit_events IS 'Server-side rate limiting per wallet operation per identifier. OWASP DoS prevention.';
COMMENT ON COLUMN wallet_nonces.expires_at IS 'Nonces expire after 5 minutes (set by application layer).';
COMMENT ON COLUMN wallet_connections.device_fingerprint IS 'Browser fingerprint hash for session binding (OWASP session fixation prevention).';
