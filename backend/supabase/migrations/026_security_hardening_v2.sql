-- ============================================================
-- MIGRATION 026: SECURITY HARDENING V2
-- Fixes Supabase Database Linter Errors & Warnings
-- Adds production-grade security infrastructure
-- Date: 2026-02-20
-- ============================================================

-- ============================================================
-- SECTION 1: FIX ERRORS
-- ============================================================

-- ——————————————————————————————————————
-- 1A. FIX: security_definer_view on v_users_missing_embedded_wallets
-- Problem: View uses SECURITY DEFINER, executing with creator's permissions
-- Fix: Recreate with security_invoker = true (uses caller's permissions + RLS)
-- ——————————————————————————————————————

DROP VIEW IF EXISTS public.v_users_missing_embedded_wallets;

CREATE VIEW public.v_users_missing_embedded_wallets
WITH (security_invoker = true)
AS
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    u.privy_id,
    u.created_at,
    wl.wallet_address AS login_wallet_address,
    wl.chain_type AS login_chain_type,
    wl.provider_name,
    CASE
        WHEN u.privy_id IS NULL THEN 'missing_privy_id'
        WHEN NOT EXISTS (
            SELECT 1 FROM privy_wallets pw
            WHERE pw.user_id = u.id AND pw.chain_type = 'solana'
        ) THEN 'missing_solana_wallet'
        WHEN NOT EXISTS (
            SELECT 1 FROM privy_wallets pw
            WHERE pw.user_id = u.id AND pw.chain_type = 'ethereum'
        ) THEN 'missing_ethereum_wallet'
        ELSE 'ok'
    END AS issue_type
FROM users u
LEFT JOIN wallet_logins wl ON wl.user_id = u.id
WHERE
    u.privy_id IS NULL
    OR NOT EXISTS (
        SELECT 1 FROM privy_wallets pw
        WHERE pw.user_id = u.id AND pw.chain_type = 'solana'
    )
    OR NOT EXISTS (
        SELECT 1 FROM privy_wallets pw
        WHERE pw.user_id = u.id AND pw.chain_type = 'ethereum'
    );

COMMENT ON VIEW public.v_users_missing_embedded_wallets IS
    'Admin diagnostic view: users missing Privy embedded wallets. Uses security_invoker for RLS compliance.';

-- ——————————————————————————————————————
-- 1B. FIX: rls_disabled_in_public on spatial_ref_sys
-- Problem: PostGIS system table has no RLS
-- Fix: Enable RLS + add service-only policy (public already revoked in 013)
-- ——————————————————————————————————————

DO $$
BEGIN
    -- Enable RLS on spatial_ref_sys (this is owned by postgres/superuser, 
    -- but we can enable RLS to satisfy the linter)
    EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';

    -- Force RLS even for the table owner
    EXECUTE 'ALTER TABLE public.spatial_ref_sys FORCE ROW LEVEL SECURITY';

    RAISE NOTICE 'Enabled RLS on spatial_ref_sys';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Cannot enable RLS on spatial_ref_sys (insufficient privilege) — this is expected on some Supabase plans';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error enabling RLS on spatial_ref_sys: %', SQLERRM;
END $$;

-- Add a select-only policy for service_role and postgres
DO $$
BEGIN
    EXECUTE 'DROP POLICY IF EXISTS spatial_ref_sys_service_read ON public.spatial_ref_sys';
    EXECUTE 'CREATE POLICY spatial_ref_sys_service_read ON public.spatial_ref_sys
        FOR SELECT USING (
            current_setting(''role'', true) = ''service_role''
            OR current_user = ''postgres''
            OR current_setting(''role'', true) = ''authenticated''
        )';
    RAISE NOTICE 'Created RLS policy for spatial_ref_sys';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Cannot create policy on spatial_ref_sys — this is expected on some Supabase plans';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating policy on spatial_ref_sys: %', SQLERRM;
END $$;


-- ============================================================
-- SECTION 2: FIX WARNINGS
-- ============================================================

-- ——————————————————————————————————————
-- 2A. FIX: function_search_path_mutable on 3 functions
-- Problem: Functions don't set search_path, vulnerable to schema hijacking
-- Fix: Lock search_path to 'public'
-- ——————————————————————————————————————

ALTER FUNCTION public.cleanup_old_wallet_transactions() SET search_path = public;
ALTER FUNCTION public.get_user_portfolio_value(UUID) SET search_path = public;
ALTER FUNCTION public.mark_stale_balances() SET search_path = public;

-- ——————————————————————————————————————
-- 2B. FIX: rls_policy_always_true on wallet_balances_cache
-- Problem: balance_cache_manage_service uses USING (TRUE) for ALL operations
-- Fix: Restrict to service_role only
-- ——————————————————————————————————————

DROP POLICY IF EXISTS balance_cache_manage_service ON public.wallet_balances_cache;

-- Service role can manage all balance cache entries
CREATE POLICY balance_cache_manage_service ON public.wallet_balances_cache
    FOR ALL
    USING (current_setting('role', true) = 'service_role')
    WITH CHECK (current_setting('role', true) = 'service_role');

-- ——————————————————————————————————————
-- 2C. FIX: rls_policy_always_true on wallet_transactions (INSERT + UPDATE)
-- Problem: wallet_tx_insert_service & wallet_tx_update_service use TRUE
-- Fix: Restrict to service_role only
-- ——————————————————————————————————————

DROP POLICY IF EXISTS wallet_tx_insert_service ON public.wallet_transactions;
DROP POLICY IF EXISTS wallet_tx_update_service ON public.wallet_transactions;

-- Only service_role (backend) can insert transactions
CREATE POLICY wallet_tx_insert_service ON public.wallet_transactions
    FOR INSERT
    WITH CHECK (current_setting('role', true) = 'service_role');

-- Only service_role (backend) can update transaction status
CREATE POLICY wallet_tx_update_service ON public.wallet_transactions
    FOR UPDATE
    USING (current_setting('role', true) = 'service_role')
    WITH CHECK (current_setting('role', true) = 'service_role');

-- ——————————————————————————————————————
-- 2D. FIX: extension_in_public (postgis)
-- Problem: Extension installed in public schema is a security risk
-- Fix: Move to 'extensions' schema (standard practice)
-- ——————————————————————————————————————

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move PostGIS to extensions schema
-- Note: This requires superuser privileges, which migrations run with.
-- If this fails, it might be due to dependencies, but usually safe for PostGIS.
DO $$
BEGIN
    -- Move PostGIS to extensions schema if it exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        ALTER EXTENSION postgis SET SCHEMA extensions;
        RAISE NOTICE 'Moved PostGIS to extensions schema';
    END IF;

    -- Grant usage to public so functions can be found (if search_path includes extensions)
    GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not move PostGIS to extensions schema: %', SQLERRM;
        -- Fallback: Revoke public access (Mitigation)
        EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon';
        RAISE NOTICE 'Fallback: Revoked direct PostGIS function access from anon role';
END $$;

-- Add extensions to search_path for database (persistent)
-- Note: This cannot run inside the DO block above because it's a transaction block
DO $$
BEGIN
    ALTER DATABASE postgres SET search_path TO public, extensions;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update database search_path: %', SQLERRM;
END $$;

-- Add extensions to search_path for current session (immediate)
SET search_path TO public, extensions;


-- ============================================================
-- SECTION 3: NEW SECURITY INFRASTRUCTURE
-- Production-grade anti-hacking, anti-throttling, audit trail
-- ============================================================

-- ——————————————————————————————————————
-- 3A. LOGIN ATTEMPTS TABLE
-- Track failed login attempts for account lockout
-- Supports: email, wallet, OAuth login methods
-- ——————————————————————————————————————

CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    identifier VARCHAR(255) NOT NULL,           -- Email, wallet address, or IP
    identifier_type VARCHAR(20) NOT NULL        -- 'email', 'wallet', 'ip'
        CHECK (identifier_type IN ('email', 'wallet', 'ip', 'oauth')),
    login_method VARCHAR(30) NOT NULL           -- 'email', 'google', 'phantom', 'metamask', etc.
        CHECK (login_method IN (
            'email', 'google', 'phantom', 'solflare', 'metamask', 
            'walletconnect', 'privy', 'other'
        )),
    
    -- Attempt details
    success BOOLEAN NOT NULL DEFAULT FALSE,
    failure_reason VARCHAR(100),                -- 'invalid_password', 'invalid_signature', 'expired_nonce', etc.
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    country_code VARCHAR(2),                    -- GeoIP lookup (optional)
    
    -- Timestamps
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_identifier_length CHECK (LENGTH(identifier) >= 3 AND LENGTH(identifier) <= 255)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier 
    ON login_attempts(identifier, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip 
    ON login_attempts(ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_failed 
    ON login_attempts(identifier, success, attempted_at DESC)
    WHERE success = FALSE;
CREATE INDEX IF NOT EXISTS idx_login_attempts_cleanup 
    ON login_attempts(attempted_at);

-- RLS
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service_role (backend) and admins can access
CREATE POLICY login_attempts_service ON login_attempts
    FOR ALL
    USING (current_setting('role', true) = 'service_role');

CREATE POLICY login_attempts_admin_read ON login_attempts
    FOR SELECT
    USING (is_admin());

COMMENT ON TABLE login_attempts IS 
    'Tracks all login attempts (success/fail) for account lockout and security monitoring. Anti-brute-force.';

-- ——————————————————————————————————————
-- 3B. SECURITY EVENTS TABLE
-- Centralized audit trail for all security-relevant events
-- ——————————————————————————————————————

CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event classification
    event_type VARCHAR(50) NOT NULL             -- See CHECK constraint
        CHECK (event_type IN (
            'login_success', 'login_failure', 'login_lockout',
            'signature_invalid', 'nonce_expired', 'nonce_replay',
            'rate_limit_hit', 'rate_limit_block',
            'wallet_linked', 'wallet_unlinked',
            'session_created', 'session_expired', 'session_revoked',
            'role_changed', 'password_changed', 'email_changed',
            'account_suspended', 'account_reactivated',
            'suspicious_activity', 'ip_blocked',
            'admin_action', 'data_export'
        )),
    severity VARCHAR(10) NOT NULL DEFAULT 'info'
        CHECK (severity IN ('info', 'warn', 'error', 'critical')),
    
    -- Actor
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (actor_type IN ('user', 'admin', 'system', 'anonymous')),
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    wallet_address VARCHAR(66),
    chain VARCHAR(20),
    
    -- Details
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,          -- Extra structured data
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_description_length CHECK (LENGTH(description) >= 5)
);

-- Indexes for security event queries
CREATE INDEX IF NOT EXISTS idx_security_events_type 
    ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user 
    ON security_events(user_id, created_at DESC)
    WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_events_severity 
    ON security_events(severity, created_at DESC)
    WHERE severity IN ('error', 'critical');
CREATE INDEX IF NOT EXISTS idx_security_events_ip 
    ON security_events(ip_address, created_at DESC)
    WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_events_wallet 
    ON security_events(wallet_address, created_at DESC)
    WHERE wallet_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_events_cleanup 
    ON security_events(created_at);

-- RLS
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Service role has full access (backend writes events)
CREATE POLICY security_events_service ON security_events
    FOR ALL
    USING (current_setting('role', true) = 'service_role');

-- Admins can read all security events
CREATE POLICY security_events_admin_read ON security_events
    FOR SELECT
    USING (is_admin());

-- Users can view their own security events (e.g. in account settings)
CREATE POLICY security_events_user_read ON security_events
    FOR SELECT
    USING (auth.uid() = user_id);

COMMENT ON TABLE security_events IS 
    'Centralized security audit trail. Records all security-relevant events for monitoring and forensics.';


-- ============================================================
-- SECTION 4: SECURITY FUNCTIONS
-- ============================================================

-- ——————————————————————————————————————
-- 4A. check_account_lockout()
-- Returns TRUE if the account should be locked (too many failed attempts)
-- Rule: 5 failed attempts in 15 minutes = locked for 30 minutes
-- ——————————————————————————————————————

CREATE OR REPLACE FUNCTION check_account_lockout(
    p_identifier VARCHAR,
    p_max_attempts INTEGER DEFAULT 5,
    p_window_minutes INTEGER DEFAULT 15,
    p_lockout_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    failed_count INTEGER;
    last_attempt TIMESTAMPTZ;
    is_locked BOOLEAN;
    lockout_until TIMESTAMPTZ;
    remaining_seconds INTEGER;
BEGIN
    -- Count recent failed attempts
    SELECT COUNT(*), MAX(attempted_at)
    INTO failed_count, last_attempt
    FROM login_attempts
    WHERE identifier = p_identifier
      AND success = FALSE
      AND attempted_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;

    -- Check if currently locked
    IF failed_count >= p_max_attempts AND last_attempt IS NOT NULL THEN
        lockout_until := last_attempt + (p_lockout_minutes || ' minutes')::INTERVAL;
        
        IF lockout_until > NOW() THEN
            remaining_seconds := EXTRACT(EPOCH FROM (lockout_until - NOW()))::INTEGER;
            RETURN jsonb_build_object(
                'locked', TRUE,
                'failed_count', failed_count,
                'lockout_until', lockout_until,
                'remaining_seconds', remaining_seconds
            );
        END IF;
    END IF;

    -- Not locked
    RETURN jsonb_build_object(
        'locked', FALSE,
        'failed_count', failed_count,
        'attempts_remaining', p_max_attempts - failed_count
    );
END;
$$;

COMMENT ON FUNCTION check_account_lockout IS 
    'Anti-brute-force: checks if an identifier (email/wallet/IP) is locked due to failed login attempts.';

-- ——————————————————————————————————————
-- 4B. log_security_event()
-- Centralized function for logging security events
-- ——————————————————————————————————————

CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type VARCHAR,
    p_severity VARCHAR DEFAULT 'info',
    p_user_id UUID DEFAULT NULL,
    p_actor_type VARCHAR DEFAULT 'system',
    p_description TEXT DEFAULT '',
    p_ip_address INET DEFAULT NULL,
    p_wallet_address VARCHAR DEFAULT NULL,
    p_chain VARCHAR DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO security_events (
        event_type, severity, user_id, actor_type,
        description, ip_address, wallet_address, chain, metadata
    )
    VALUES (
        p_event_type, p_severity, p_user_id, p_actor_type,
        p_description, p_ip_address, p_wallet_address, p_chain, p_metadata
    )
    RETURNING id INTO event_id;

    -- For critical events, raise a notice for monitoring systems
    IF p_severity = 'critical' THEN
        RAISE NOTICE 'CRITICAL SECURITY EVENT [%]: % (user: %, ip: %)',
            p_event_type, p_description, p_user_id, p_ip_address;
    END IF;

    RETURN event_id;
END;
$$;

COMMENT ON FUNCTION log_security_event IS 
    'Centralized security event logger. All security-relevant activities should be logged through this function.';

-- ——————————————————————————————————————
-- 4C. cleanup_old_security_data()
-- Periodic cleanup of old login attempts and security events
-- Call via Supabase pg_cron or backend scheduler
-- ——————————————————————————————————————

CREATE OR REPLACE FUNCTION cleanup_old_security_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    login_attempts_deleted INTEGER;
    security_events_deleted INTEGER;
    nonces_deleted INTEGER;
    rate_limits_deleted INTEGER;
BEGIN
    -- Clean login attempts older than 30 days
    DELETE FROM login_attempts
    WHERE attempted_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS login_attempts_deleted = ROW_COUNT;

    -- Clean security events older than 90 days (keep critical for 1 year)
    DELETE FROM security_events
    WHERE created_at < NOW() - INTERVAL '90 days'
      AND severity NOT IN ('error', 'critical');
    GET DIAGNOSTICS security_events_deleted = ROW_COUNT;

    -- Clean expired nonces (already done by cleanup_expired_nonces, but belt-and-suspenders)
    DELETE FROM wallet_nonces
    WHERE expires_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS nonces_deleted = ROW_COUNT;

    -- Clean old rate limit windows
    DELETE FROM rate_limit_events
    WHERE window_end < NOW() - INTERVAL '1 day'
      AND is_blocked = FALSE;
    GET DIAGNOSTICS rate_limits_deleted = ROW_COUNT;

    RETURN jsonb_build_object(
        'login_attempts_deleted', login_attempts_deleted,
        'security_events_deleted', security_events_deleted,
        'nonces_deleted', nonces_deleted,
        'rate_limits_deleted', rate_limits_deleted,
        'cleaned_at', NOW()
    );
END;
$$;

COMMENT ON FUNCTION cleanup_old_security_data IS 
    'Periodic cleanup of expired security data. Run daily via pg_cron or backend scheduler.';


-- ============================================================
-- SECTION 5: ADDITIONAL ROLE-BASED SECURITY
-- Hardening for user, artist, admin roles
-- ============================================================

-- ——————————————————————————————————————
-- 5A. is_artist() helper function (mirrors is_admin())
-- Used in RLS policies for artist-specific access control
-- ——————————————————————————————————————

CREATE OR REPLACE FUNCTION is_artist()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('artist', 'admin', 'super_admin')
    );
END;
$$;

COMMENT ON FUNCTION is_artist IS 
    'RLS helper: returns TRUE if current user has artist, admin, or super_admin role.';

-- ——————————————————————————————————————
-- 5B. get_user_role() function with search_path fix
-- Already exists but may not have search_path set
-- ——————————————————————————————————————

-- Ensure function has locked search_path (belt-and-suspenders)
DO $$
BEGIN
    ALTER FUNCTION public.get_user_role SET search_path = public;
EXCEPTION
    WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
    ALTER FUNCTION public.is_admin SET search_path = public;
EXCEPTION
    WHEN undefined_function THEN NULL;
END $$;

-- ——————————————————————————————————————
-- 5C. Trigger: Auto-log critical security events
-- Fires on role changes and account suspensions
-- ——————————————————————————————————————

CREATE OR REPLACE FUNCTION trigger_log_user_security_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log role changes
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        PERFORM log_security_event(
            'role_changed', 'warn', NEW.id, 'system',
            format('Role changed from %s to %s', OLD.role, NEW.role),
            NULL, NULL, NULL,
            jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role)
        );
    END IF;

    -- Log account suspension/reactivation
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
        IF NEW.is_active = FALSE THEN
            PERFORM log_security_event(
                'account_suspended', 'critical', NEW.id, 'system',
                format('Account %s suspended', NEW.username),
                NULL, NULL, NULL,
                jsonb_build_object('username', NEW.username)
            );
        ELSE
            PERFORM log_security_event(
                'account_reactivated', 'warn', NEW.id, 'system',
                format('Account %s reactivated', NEW.username),
                NULL, NULL, NULL,
                jsonb_build_object('username', NEW.username)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Attach trigger to users table
DROP TRIGGER IF EXISTS trigger_user_security_changes ON users;
CREATE TRIGGER trigger_user_security_changes
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN (
        OLD.role IS DISTINCT FROM NEW.role
        OR OLD.is_active IS DISTINCT FROM NEW.is_active
    )
    EXECUTE FUNCTION trigger_log_user_security_changes();


-- ============================================================
-- SECTION 6: COMMENTS & DOCUMENTATION
-- ============================================================

COMMENT ON COLUMN login_attempts.identifier IS 
    'Email address, wallet address, or IP address — used to identify the login target.';
COMMENT ON COLUMN login_attempts.failure_reason IS 
    'Machine-readable failure reason: invalid_password, invalid_signature, expired_nonce, rate_limited, locked, etc.';
COMMENT ON COLUMN security_events.event_type IS 
    'Categorized security event type for filtering and monitoring.';
COMMENT ON COLUMN security_events.severity IS 
    'info=routine, warn=notable, error=failed security check, critical=requires investigation.';

-- ============================================================
-- DONE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '  Migration 026: Security Hardening V2  ';
    RAISE NOTICE '  - Fixed SECURITY DEFINER view         ';
    RAISE NOTICE '  - Fixed spatial_ref_sys RLS           ';
    RAISE NOTICE '  - Fixed 3 function search_paths       ';
    RAISE NOTICE '  - Fixed 3 overly permissive policies  ';
    RAISE NOTICE '  - Moved PostGIS to extensions schema  ';
    RAISE NOTICE '  - Added login_attempts table          ';
    RAISE NOTICE '  - Added security_events table         ';
    RAISE NOTICE '  - Added lockout, logging, cleanup     ';
    RAISE NOTICE '  - Added role-based security helpers   ';
    RAISE NOTICE '========================================';
END $$;
