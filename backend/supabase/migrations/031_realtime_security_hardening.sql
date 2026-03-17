-- ============================================================
-- MIGRATION 031: REAL-TIME SECURITY HARDENING
-- Anti-Throttling, Anti-Hacking, Anti-Chunking
-- Best Practices for Mobile & Desktop
-- Date: 2026-03-17
-- ============================================================

-- ============================================================
-- SECTION 1: ANTI-THROTTLING (Rate Limiting at DB Level)
-- ============================================================

-- 1A. API Rate Limits Table
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    identifier VARCHAR(255) NOT NULL,           -- user_id, IP, or API key
    identifier_type VARCHAR(20) NOT NULL
        CHECK (identifier_type IN ('user', 'ip', 'api_key', 'anonymous')),

    -- Endpoint
    endpoint VARCHAR(255) NOT NULL,             -- '/arts/marketplace', '/admin/dashboard', etc.
    method VARCHAR(10) NOT NULL DEFAULT 'GET'
        CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),

    -- Window
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    window_end TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,

    -- Limits (per role)
    max_requests INTEGER NOT NULL DEFAULT 60,   -- default: 60 req/min

    -- Block status
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_until TIMESTAMPTZ,
    block_reason VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_window CHECK (window_end > window_start),
    CONSTRAINT valid_request_count CHECK (request_count >= 0)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
    ON api_rate_limits(identifier, endpoint, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked
    ON api_rate_limits(identifier, is_blocked)
    WHERE is_blocked = TRUE;
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
    ON api_rate_limits(window_end)
    WHERE is_blocked = FALSE;

-- RLS
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_limits_service_only ON api_rate_limits
    FOR ALL USING (current_setting('role', true) = 'service_role');

CREATE POLICY rate_limits_admin_read ON api_rate_limits
    FOR SELECT USING (is_admin());

-- 1B. Rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier VARCHAR,
    p_identifier_type VARCHAR DEFAULT 'user',
    p_endpoint VARCHAR DEFAULT '*',
    p_method VARCHAR DEFAULT 'GET',
    p_max_requests INTEGER DEFAULT 60,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window_start TIMESTAMPTZ;
    v_current_count INTEGER;
    v_is_blocked BOOLEAN;
    v_blocked_until TIMESTAMPTZ;
    v_remaining INTEGER;
BEGIN
    v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;

    -- Check if currently blocked
    SELECT is_blocked, blocked_until
    INTO v_is_blocked, v_blocked_until
    FROM api_rate_limits
    WHERE identifier = p_identifier
      AND endpoint = p_endpoint
      AND is_blocked = TRUE
      AND blocked_until > NOW()
    LIMIT 1;

    IF v_is_blocked THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'reason', 'rate_limited',
            'blocked_until', v_blocked_until,
            'remaining', 0,
            'retry_after', EXTRACT(EPOCH FROM (v_blocked_until - NOW()))::INTEGER
        );
    END IF;

    -- Count requests in current window
    SELECT COALESCE(SUM(request_count), 0)
    INTO v_current_count
    FROM api_rate_limits
    WHERE identifier = p_identifier
      AND endpoint = p_endpoint
      AND method = p_method
      AND window_start >= v_window_start
      AND is_blocked = FALSE;

    v_remaining := GREATEST(p_max_requests - v_current_count - 1, 0);

    -- Check if limit exceeded
    IF v_current_count >= p_max_requests THEN
        -- Block for double the window duration
        INSERT INTO api_rate_limits (
            identifier, identifier_type, endpoint, method,
            window_start, window_end, request_count,
            max_requests, is_blocked, blocked_until, block_reason
        ) VALUES (
            p_identifier, p_identifier_type, p_endpoint, p_method,
            NOW(), NOW() + (p_window_seconds * 2 || ' seconds')::INTERVAL, 0,
            p_max_requests, TRUE, NOW() + (p_window_seconds * 2 || ' seconds')::INTERVAL,
            'Rate limit exceeded: ' || v_current_count || '/' || p_max_requests
        );

        RETURN jsonb_build_object(
            'allowed', FALSE,
            'reason', 'rate_limit_exceeded',
            'current_count', v_current_count,
            'max_requests', p_max_requests,
            'remaining', 0,
            'retry_after', p_window_seconds * 2
        );
    END IF;

    -- Record the request
    INSERT INTO api_rate_limits (
        identifier, identifier_type, endpoint, method,
        window_start, window_end, request_count, max_requests
    ) VALUES (
        p_identifier, p_identifier_type, p_endpoint, p_method,
        NOW(), NOW() + (p_window_seconds || ' seconds')::INTERVAL, 1, p_max_requests
    );

    RETURN jsonb_build_object(
        'allowed', TRUE,
        'current_count', v_current_count + 1,
        'max_requests', p_max_requests,
        'remaining', v_remaining,
        'window_seconds', p_window_seconds
    );
END;
$$;

COMMENT ON FUNCTION check_rate_limit IS
    'Anti-throttling: sliding window rate limiter. Check before processing any API request.';

-- 1C. Role-based rate limit configuration
CREATE TABLE IF NOT EXISTS rate_limit_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,                  -- 'anon', 'user', 'artist', 'admin', 'super_admin'
    endpoint_pattern VARCHAR(255) NOT NULL,     -- '/arts/*', '/admin/*', '*'
    max_requests INTEGER NOT NULL DEFAULT 60,
    window_seconds INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(role, endpoint_pattern)
);

ALTER TABLE rate_limit_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_config_service ON rate_limit_config
    FOR ALL USING (current_setting('role', true) = 'service_role');
CREATE POLICY rate_config_admin_read ON rate_limit_config
    FOR SELECT USING (is_admin());

-- Seed default rate limits
INSERT INTO rate_limit_config (role, endpoint_pattern, max_requests, window_seconds) VALUES
    ('anonymous', '/auth/*',       10,  60),   -- 10 req/min for auth endpoints
    ('anonymous', '/arts/*',       30,  60),   -- 30 req/min for browsing
    ('anonymous', '*',             20,  60),   -- 20 req/min general
    ('user',      '/arts/*',       60,  60),   -- 60 req/min for browsing
    ('user',      '/bookmarks/*',  30,  60),   -- 30 req/min
    ('user',      '*',             60,  60),   -- 60 req/min general
    ('artist',    '/artist/*',    120,  60),   -- 120 req/min for artist ops
    ('artist',    '/arts/mint',    10,  300),  -- 10 mints per 5 minutes
    ('artist',    '*',             90,  60),   -- 90 req/min general
    ('admin',     '/admin/*',     200,  60),   -- 200 req/min for admin
    ('admin',     '*',            200,  60),   -- 200 req/min general
    ('super_admin', '*',          500,  60)    -- 500 req/min for super admin
ON CONFLICT (role, endpoint_pattern) DO NOTHING;

-- 1D. Get rate limit config for a role
CREATE OR REPLACE FUNCTION get_rate_limit_for_role(
    p_role VARCHAR,
    p_endpoint VARCHAR
)
RETURNS TABLE (max_requests INTEGER, window_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT rlc.max_requests, rlc.window_seconds
    FROM rate_limit_config rlc
    WHERE rlc.role = p_role
      AND rlc.is_active = TRUE
      AND (rlc.endpoint_pattern = p_endpoint
           OR rlc.endpoint_pattern = '*'
           OR p_endpoint LIKE REPLACE(rlc.endpoint_pattern, '*', '%'))
    ORDER BY
        CASE WHEN rlc.endpoint_pattern = p_endpoint THEN 0
             WHEN rlc.endpoint_pattern != '*' THEN 1
             ELSE 2
        END
    LIMIT 1;
END;
$$;

-- ============================================================
-- SECTION 2: ANTI-HACKING (Input Validation & Injection Prevention)
-- ============================================================

-- 2A. Blocked IPs table
CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    reason VARCHAR(255) NOT NULL,
    blocked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,                     -- NULL = permanent
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_reason CHECK (LENGTH(reason) >= 5)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blocked_ips_active
    ON blocked_ips(ip_address) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expiry
    ON blocked_ips(expires_at) WHERE is_active = TRUE;

ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY blocked_ips_service ON blocked_ips
    FOR ALL USING (current_setting('role', true) = 'service_role');
CREATE POLICY blocked_ips_admin ON blocked_ips
    FOR ALL USING (is_admin());

-- 2B. Check if IP is blocked
CREATE OR REPLACE FUNCTION is_ip_blocked(p_ip INET)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocked_ips
        WHERE ip_address = p_ip
          AND is_active = TRUE
          AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$;

-- 2C. Sanitize text input (anti-XSS, anti-injection)
CREATE OR REPLACE FUNCTION sanitize_text_input(
    p_input TEXT,
    p_max_length INTEGER DEFAULT 10000,
    p_allow_html BOOLEAN DEFAULT FALSE
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    v_result TEXT;
BEGIN
    IF p_input IS NULL THEN
        RETURN NULL;
    END IF;

    v_result := p_input;

    -- Enforce max length
    IF LENGTH(v_result) > p_max_length THEN
        v_result := LEFT(v_result, p_max_length);
    END IF;

    -- Strip control characters (except newlines and tabs)
    v_result := regexp_replace(v_result, E'[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]', '', 'g');

    IF NOT p_allow_html THEN
        -- Escape HTML special characters (XSS prevention)
        v_result := REPLACE(v_result, '&', '&amp;');
        v_result := REPLACE(v_result, '<', '&lt;');
        v_result := REPLACE(v_result, '>', '&gt;');
        v_result := REPLACE(v_result, '"', '&quot;');
        v_result := REPLACE(v_result, '''', '&#x27;');
    END IF;

    -- Remove SQL injection patterns
    v_result := regexp_replace(v_result, '(--|;|/\*|\*/|xp_|EXEC\s|EXECUTE\s|UNION\s+SELECT|DROP\s+TABLE|ALTER\s+TABLE|DELETE\s+FROM|INSERT\s+INTO|UPDATE\s+.*SET)', '', 'gi');

    RETURN TRIM(v_result);
END;
$$;

COMMENT ON FUNCTION sanitize_text_input IS
    'Anti-XSS/injection: sanitizes user text input. Use on all user-provided text columns.';

-- 2D. Validate UUID parameter
CREATE OR REPLACE FUNCTION validate_uuid_param(p_value TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
    IF p_value IS NULL OR p_value = '' THEN
        RAISE EXCEPTION 'UUID parameter is required';
    END IF;

    -- Strict UUID format validation
    IF p_value !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Invalid UUID format: %', LEFT(p_value, 50);
    END IF;

    RETURN p_value::UUID;
END;
$$;

-- 2E. Input validation trigger for artworks
CREATE OR REPLACE FUNCTION trigger_validate_artwork_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate title length (prevents data bombs)
    IF LENGTH(NEW.title) > 255 THEN
        RAISE EXCEPTION 'Artwork title exceeds maximum length of 255 characters';
    END IF;

    -- Validate description length
    IF NEW.description IS NOT NULL AND LENGTH(NEW.description) > 50000 THEN
        RAISE EXCEPTION 'Artwork description exceeds maximum length of 50,000 characters';
    END IF;

    -- Sanitize title and description
    NEW.title := sanitize_text_input(NEW.title, 255, FALSE);
    IF NEW.description IS NOT NULL THEN
        NEW.description := sanitize_text_input(NEW.description, 50000, FALSE);
    END IF;

    -- Validate image URL format (prevent SSRF)
    IF NEW.primary_image_url IS NOT NULL THEN
        IF NEW.primary_image_url !~ '^https?://' THEN
            RAISE EXCEPTION 'Image URL must start with http:// or https://';
        END IF;
        IF LENGTH(NEW.primary_image_url) > 2048 THEN
            RAISE EXCEPTION 'Image URL exceeds maximum length of 2048 characters';
        END IF;
    END IF;

    -- Validate slug format
    IF NEW.slug IS NOT NULL AND NEW.slug !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' THEN
        -- Auto-fix slug instead of rejecting
        NEW.slug := regexp_replace(LOWER(TRIM(NEW.slug)), '[^a-z0-9-]', '-', 'g');
        NEW.slug := regexp_replace(NEW.slug, '-+', '-', 'g');
        NEW.slug := TRIM(BOTH '-' FROM NEW.slug);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_artwork_input ON artworks;
CREATE TRIGGER trg_validate_artwork_input
    BEFORE INSERT OR UPDATE ON artworks
    FOR EACH ROW EXECUTE FUNCTION trigger_validate_artwork_input();

-- 2F. Input validation trigger for forum posts
CREATE OR REPLACE FUNCTION trigger_validate_forum_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate content length
    IF LENGTH(NEW.content) > 100000 THEN
        RAISE EXCEPTION 'Forum content exceeds maximum length of 100,000 characters';
    END IF;

    IF LENGTH(NEW.content) < 1 THEN
        RAISE EXCEPTION 'Forum content cannot be empty';
    END IF;

    -- Sanitize content
    NEW.content := sanitize_text_input(NEW.content, 100000, FALSE);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_forum_post_input ON forum_posts;
CREATE TRIGGER trg_validate_forum_post_input
    BEFORE INSERT OR UPDATE ON forum_posts
    FOR EACH ROW EXECUTE FUNCTION trigger_validate_forum_input();

-- 2G. Input validation trigger for forum threads
CREATE OR REPLACE FUNCTION trigger_validate_thread_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate title
    IF LENGTH(NEW.title) > 255 THEN
        RAISE EXCEPTION 'Thread title exceeds maximum length of 255 characters';
    END IF;
    IF LENGTH(NEW.title) < 3 THEN
        RAISE EXCEPTION 'Thread title must be at least 3 characters';
    END IF;

    -- Sanitize
    NEW.title := sanitize_text_input(NEW.title, 255, FALSE);
    NEW.content := sanitize_text_input(NEW.content, 100000, FALSE);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_thread_input ON forum_threads;
CREATE TRIGGER trg_validate_thread_input
    BEFORE INSERT OR UPDATE ON forum_threads
    FOR EACH ROW EXECUTE FUNCTION trigger_validate_thread_input();

-- ============================================================
-- SECTION 3: ANTI-CHUNKING (Pagination Security)
-- ============================================================

-- 3A. Secure pagination function
CREATE OR REPLACE FUNCTION validate_pagination(
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 20,
    p_max_page_size INTEGER DEFAULT 100,
    p_max_page INTEGER DEFAULT 10000
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    v_page INTEGER;
    v_page_size INTEGER;
    v_offset INTEGER;
BEGIN
    -- Enforce minimum page
    v_page := GREATEST(COALESCE(p_page, 1), 1);

    -- Enforce maximum page (prevent deep pagination attacks)
    v_page := LEAST(v_page, p_max_page);

    -- Enforce page size bounds
    v_page_size := GREATEST(COALESCE(p_page_size, 20), 1);
    v_page_size := LEAST(v_page_size, p_max_page_size);

    -- Calculate safe offset
    v_offset := (v_page - 1) * v_page_size;

    -- Prevent integer overflow on offset
    IF v_offset < 0 OR v_offset > 1000000 THEN
        v_offset := 0;
        v_page := 1;
    END IF;

    RETURN jsonb_build_object(
        'page', v_page,
        'page_size', v_page_size,
        'offset', v_offset,
        'limit', v_page_size
    );
END;
$$;

COMMENT ON FUNCTION validate_pagination IS
    'Anti-chunking: validates pagination params. Max 100 rows/page, max page 10000. Prevents deep pagination attacks.';

-- 3B. Cursor-based pagination helper (mobile-optimized)
CREATE OR REPLACE FUNCTION validate_cursor(
    p_cursor TEXT,
    p_direction VARCHAR DEFAULT 'next'
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    v_cursor_parts TEXT[];
    v_timestamp TIMESTAMPTZ;
    v_id UUID;
BEGIN
    IF p_cursor IS NULL OR p_cursor = '' THEN
        RETURN jsonb_build_object(
            'valid', TRUE,
            'has_cursor', FALSE,
            'direction', p_direction
        );
    END IF;

    -- Validate direction
    IF p_direction NOT IN ('next', 'prev') THEN
        RAISE EXCEPTION 'Invalid cursor direction. Must be "next" or "prev"';
    END IF;

    -- Cursor format: "timestamp|uuid" (base64 encoded)
    BEGIN
        -- Decode cursor (base64)
        v_cursor_parts := string_to_array(convert_from(decode(p_cursor, 'base64'), 'UTF8'), '|');
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Invalid cursor format';
    END;

    IF array_length(v_cursor_parts, 1) != 2 THEN
        RAISE EXCEPTION 'Invalid cursor format: expected 2 parts';
    END IF;

    -- Validate timestamp part
    BEGIN
        v_timestamp := v_cursor_parts[1]::TIMESTAMPTZ;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Invalid cursor timestamp';
    END;

    -- Validate UUID part
    IF v_cursor_parts[2] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Invalid cursor UUID';
    END IF;
    v_id := v_cursor_parts[2]::UUID;

    -- Prevent cursor time travel (no more than 1 year in the past)
    IF v_timestamp < NOW() - INTERVAL '1 year' THEN
        RAISE EXCEPTION 'Cursor has expired';
    END IF;

    RETURN jsonb_build_object(
        'valid', TRUE,
        'has_cursor', TRUE,
        'timestamp', v_timestamp,
        'id', v_id,
        'direction', p_direction
    );
END;
$$;

COMMENT ON FUNCTION validate_cursor IS
    'Anti-chunking: validates cursor for cursor-based pagination. Prevents cursor manipulation attacks.';

-- 3C. Generate cursor for a record
CREATE OR REPLACE FUNCTION generate_cursor(
    p_timestamp TIMESTAMPTZ,
    p_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
    RETURN encode(convert_to(p_timestamp::TEXT || '|' || p_id::TEXT, 'UTF8'), 'base64');
END;
$$;

-- 3D. Validate sort parameters (whitelist approach)
CREATE OR REPLACE FUNCTION validate_sort_column(
    p_column TEXT,
    p_allowed_columns TEXT[] DEFAULT ARRAY['created_at', 'updated_at', 'title', 'views', 'likes', 'price']
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
    IF p_column IS NULL OR p_column = '' THEN
        RETURN 'created_at';  -- safe default
    END IF;

    -- Lowercase for comparison
    p_column := LOWER(TRIM(p_column));

    -- Whitelist check
    IF p_column = ANY(p_allowed_columns) THEN
        RETURN p_column;
    ELSE
        -- Log the attempt but return safe default
        RAISE NOTICE 'Invalid sort column attempted: %', p_column;
        RETURN 'created_at';
    END IF;
END;
$$;

COMMENT ON FUNCTION validate_sort_column IS
    'Anti-injection: validates sort column against whitelist. Returns safe default for invalid columns.';

-- ============================================================
-- SECTION 4: REALTIME DATA SECURITY (Mobile/Desktop)
-- ============================================================

-- 4A. Realtime authorization policies for arts table
-- Ensure only relevant changes are broadcast
ALTER TABLE arts REPLICA IDENTITY FULL;
ALTER TABLE artworks REPLICA IDENTITY FULL;

-- 4B. Create a Supabase Realtime publication for arts
-- (Supabase auto-creates 'supabase_realtime' publication, we add tables to it)
DO $$
BEGIN
    -- Add arts table to realtime publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE arts;
        RAISE NOTICE 'Added arts to supabase_realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'arts already in supabase_realtime publication';
        WHEN undefined_object THEN
            RAISE NOTICE 'supabase_realtime publication not found (expected in local dev)';
    END;

    -- Add artworks table to realtime publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE artworks;
        RAISE NOTICE 'Added artworks to supabase_realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'artworks already in supabase_realtime publication';
        WHEN undefined_object THEN
            RAISE NOTICE 'supabase_realtime publication not found (expected in local dev)';
    END;

    -- Add notifications to realtime publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
        RAISE NOTICE 'Added notifications to supabase_realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'notifications already in supabase_realtime publication';
        WHEN undefined_object THEN
            RAISE NOTICE 'supabase_realtime publication not found (expected in local dev)';
    END;

    -- Remove old nfts publication reference if exists
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE nfts;
    EXCEPTION
        WHEN undefined_object THEN NULL;
        WHEN undefined_table THEN NULL;
    END;
END $$;

-- 4C. Realtime connection tracking (for WebSocket rate limiting)
CREATE TABLE IF NOT EXISTS realtime_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(100) NOT NULL,
    ip_address INET,
    device_type VARCHAR(20)                     -- 'mobile', 'desktop', 'tablet'
        CHECK (device_type IN ('mobile', 'desktop', 'tablet', 'unknown')),
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Anti-abuse: max connections per user
    CONSTRAINT valid_channel CHECK (LENGTH(channel) <= 100)
);

CREATE INDEX IF NOT EXISTS idx_realtime_conn_user
    ON realtime_connections(user_id, is_active)
    WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_realtime_conn_channel
    ON realtime_connections(channel, is_active)
    WHERE is_active = TRUE;

ALTER TABLE realtime_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY realtime_conn_service ON realtime_connections
    FOR ALL USING (current_setting('role', true) = 'service_role');
CREATE POLICY realtime_conn_user_read ON realtime_connections
    FOR SELECT USING (auth.uid() = user_id);

-- 4D. Check realtime connection limits
CREATE OR REPLACE FUNCTION check_realtime_connection_limit(
    p_user_id UUID,
    p_max_connections INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_active_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_active_count
    FROM realtime_connections
    WHERE user_id = p_user_id
      AND is_active = TRUE;

    IF v_active_count >= p_max_connections THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'reason', 'max_connections_exceeded',
            'active_connections', v_active_count,
            'max_connections', p_max_connections
        );
    END IF;

    RETURN jsonb_build_object(
        'allowed', TRUE,
        'active_connections', v_active_count,
        'max_connections', p_max_connections,
        'remaining', p_max_connections - v_active_count
    );
END;
$$;

-- ============================================================
-- SECTION 5: CLEANUP FUNCTIONS
-- ============================================================

-- 5A. Cleanup expired rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rate_deleted INTEGER;
    v_conn_deleted INTEGER;
    v_ip_deleted INTEGER;
BEGIN
    -- Clean expired rate limit windows (older than 1 day)
    DELETE FROM api_rate_limits
    WHERE window_end < NOW() - INTERVAL '1 day'
      AND is_blocked = FALSE;
    GET DIAGNOSTICS v_rate_deleted = ROW_COUNT;

    -- Clean unblocked entries older than 1 hour
    DELETE FROM api_rate_limits
    WHERE window_end < NOW() - INTERVAL '1 hour'
      AND is_blocked = FALSE;

    -- Clean expired blocks
    UPDATE api_rate_limits
    SET is_blocked = FALSE
    WHERE is_blocked = TRUE
      AND blocked_until < NOW();

    -- Clean stale realtime connections (inactive for > 1 hour)
    UPDATE realtime_connections
    SET is_active = FALSE, disconnected_at = NOW()
    WHERE is_active = TRUE
      AND connected_at < NOW() - INTERVAL '1 hour'
      AND disconnected_at IS NULL;
    GET DIAGNOSTICS v_conn_deleted = ROW_COUNT;

    -- Clean expired IP blocks
    UPDATE blocked_ips
    SET is_active = FALSE
    WHERE is_active = TRUE
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
    GET DIAGNOSTICS v_ip_deleted = ROW_COUNT;

    RETURN jsonb_build_object(
        'rate_limits_cleaned', v_rate_deleted,
        'connections_cleaned', v_conn_deleted,
        'ip_blocks_expired', v_ip_deleted,
        'cleaned_at', NOW()
    );
END;
$$;

COMMENT ON FUNCTION cleanup_expired_rate_limits IS
    'Periodic cleanup of expired rate limits, stale connections, and IP blocks. Run via pg_cron every 15 min.';

-- ============================================================
-- SECTION 6: GRANT PERMISSIONS
-- ============================================================

-- Rate limit functions - service role only
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION get_rate_limit_for_role TO service_role;
GRANT EXECUTE ON FUNCTION is_ip_blocked TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION check_realtime_connection_limit TO service_role;

-- Validation functions - all authenticated users
GRANT EXECUTE ON FUNCTION validate_pagination TO authenticated;
GRANT EXECUTE ON FUNCTION validate_cursor TO authenticated;
GRANT EXECUTE ON FUNCTION generate_cursor TO authenticated;
GRANT EXECUTE ON FUNCTION validate_sort_column TO authenticated;
GRANT EXECUTE ON FUNCTION validate_uuid_param TO authenticated;
GRANT EXECUTE ON FUNCTION sanitize_text_input TO authenticated;

-- ============================================================
-- DONE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE '  Migration 031: Real-time Security Hardening    ';
    RAISE NOTICE '  ANTI-THROTTLING:                               ';
    RAISE NOTICE '    - api_rate_limits table                      ';
    RAISE NOTICE '    - check_rate_limit() function                ';
    RAISE NOTICE '    - rate_limit_config with role-based limits   ';
    RAISE NOTICE '  ANTI-HACKING:                                  ';
    RAISE NOTICE '    - blocked_ips table                          ';
    RAISE NOTICE '    - sanitize_text_input() function             ';
    RAISE NOTICE '    - validate_uuid_param() function             ';
    RAISE NOTICE '    - Input validation triggers on artworks      ';
    RAISE NOTICE '    - Input validation triggers on forum         ';
    RAISE NOTICE '  ANTI-CHUNKING:                                 ';
    RAISE NOTICE '    - validate_pagination() function             ';
    RAISE NOTICE '    - validate_cursor() function                 ';
    RAISE NOTICE '    - generate_cursor() function                 ';
    RAISE NOTICE '    - validate_sort_column() function            ';
    RAISE NOTICE '  REALTIME SECURITY:                             ';
    RAISE NOTICE '    - Realtime publication for arts/artworks     ';
    RAISE NOTICE '    - realtime_connections tracking              ';
    RAISE NOTICE '    - Connection limit enforcement               ';
    RAISE NOTICE '================================================';
END $$;
